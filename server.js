const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;

const dataDir = path.join(__dirname, "data");
const usersFile = path.join(dataDir, "users.json");
const bookingsFile = path.join(dataDir, "bookings.json");
const busesFile = path.join(dataDir, "buses.json");

const defaultBuses = [
  { id: 1, name: "Swift Express", type: "AC Sleeper", departure: "08:30 PM", arrival: "05:15 AM", seatsLeft: 12, fare: 899, from: "Chennai", to: "Bangalore" },
  { id: 2, name: "Night Rider", type: "Seater", departure: "09:45 PM", arrival: "06:30 AM", seatsLeft: 18, fare: 649, from: "Chennai", to: "Bangalore" },
  { id: 3, name: "Route Prime", type: "Luxury", departure: "11:00 PM", arrival: "07:20 AM", seatsLeft: 9, fare: 1099, from: "Chennai", to: "Bangalore" }
];

function ensureStorage() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(usersFile)) {
    fs.writeFileSync(usersFile, JSON.stringify([], null, 2));
  }

  if (!fs.existsSync(bookingsFile)) {
    fs.writeFileSync(bookingsFile, JSON.stringify([], null, 2));
  }

  if (!fs.existsSync(busesFile)) {
    fs.writeFileSync(busesFile, JSON.stringify(defaultBuses, null, 2));
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function getUsers() {
  return readJson(usersFile);
}

function saveUsers(users) {
  writeJson(usersFile, users);
}

function getBookings() {
  return readJson(bookingsFile);
}

function saveBookings(bookings) {
  writeJson(bookingsFile, bookings);
}

function getBuses() {
  return readJson(busesFile);
}

function saveBuses(buses) {
  writeJson(busesFile, buses);
}

function findBus(busId) {
  return getBuses().find((bus) => bus.id === Number(busId));
}

function nextBusId(buses) {
  return buses.reduce((maxId, bus) => Math.max(maxId, Number(bus.id) || 0), 0) + 1;
}

function setFlash(req, message) {
  req.session.flash = message;
}

function takeFlash(req) {
  const message = req.session.flash || null;
  delete req.session.flash;
  return message;
}

function authRequired(req, res, next) {
  if (!req.session.user) {
    setFlash(req, "Please log in to continue booking.");
    return res.redirect("/login");
  }

  next();
}

function adminRequired(req, res, next) {
  if (!req.session.user || req.session.user.role !== "admin") {
    setFlash(req, "Admin access is required for that page.");
    return res.redirect("/");
  }

  next();
}

ensureStorage();

const adminSeedEmail = "admin@busgo.local";
const adminSeedPassword = "Admin@123";
const seedUsers = getUsers();

if (!seedUsers.some((user) => user.email === adminSeedEmail)) {
  seedUsers.unshift({
    id: `USR${Date.now()}`,
    name: "BusGo Admin",
    email: adminSeedEmail,
    passwordHash: bcrypt.hashSync(adminSeedPassword, 10),
    role: "admin",
    createdAt: new Date().toISOString()
  });
  saveUsers(seedUsers);
}

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: false }));
app.use(session({
  secret: process.env.SESSION_SECRET || "busgo-dev-secret",
  resave: false,
  saveUninitialized: false
}));

app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  res.locals.flash = takeFlash(req);
  res.locals.currentPath = req.path;
  next();
});

app.get("/", (req, res) => {
  res.render("home", { title: "BusGo - Home" });
});

app.get("/buses", (req, res) => {
  const buses = getBuses();
  res.render("buses", {
    title: "BusGo - Bus List",
    buses,
    query: {
      from: req.query.from || "Chennai",
      to: req.query.to || "Bangalore",
      date: req.query.date || "2026-05-22"
    }
  });
});

app.get("/seats", (req, res) => {
  const buses = getBuses();
  const selectedBus = findBus(req.query.busId) || buses[0];
  res.render("seats", {
    title: "BusGo - Seat Selection",
    bus: selectedBus,
    buses
  });
});

app.post("/booking/preview", authRequired, (req, res) => {
  const buses = getBuses();
  const bus = findBus(req.body.busId) || buses[0];
  const selectedSeats = Array.isArray(req.body.seats)
    ? req.body.seats
    : req.body.seats
      ? String(req.body.seats).split(",").filter(Boolean)
      : [];

  if (selectedSeats.length === 0) {
    setFlash(req, "Select at least one seat before continuing.");
    return res.redirect(`/seats?busId=${bus.id}`);
  }

  req.session.bookingDraft = {
    busId: bus.id,
    busName: bus.name,
    route: `${bus.from} to ${bus.to}`,
    fare: bus.fare,
    seats: selectedSeats
  };

  res.redirect("/booking");
});

app.get("/booking", authRequired, (req, res) => {
  const buses = getBuses();
  const draft = req.session.bookingDraft || {
    busId: buses[0].id,
    busName: buses[0].name,
    route: `${buses[0].from} to ${buses[0].to}`,
    fare: buses[0].fare,
    seats: ["2", "3"]
  };

  res.render("booking", {
    title: "BusGo - Booking",
    bookingDraft: draft
  });
});

app.post("/bookings", authRequired, (req, res) => {
  const draft = req.session.bookingDraft;

  if (!draft) {
    setFlash(req, "Start from seat selection before confirming booking.");
    return res.redirect("/buses");
  }

  const passengerName = req.body.name?.trim();
  const phone = req.body.phone?.trim();
  const email = req.body.email?.trim();
  const gender = req.body.gender || "Not specified";
  const note = req.body.note?.trim() || "-";

  if (!passengerName || !phone || !email) {
    setFlash(req, "Fill in name, phone, and email to confirm the booking.");
    return res.redirect("/booking");
  }

  const bookings = getBookings();
  const booking = {
    id: `BK${Date.now()}`,
    userId: req.session.user.id,
    userEmail: req.session.user.email,
    busId: draft.busId,
    busName: draft.busName,
    route: draft.route,
    seats: draft.seats,
    fare: draft.fare,
    totalFare: draft.seats.length * draft.fare,
    passengerName,
    phone,
    email,
    gender,
    note,
    createdAt: new Date().toISOString()
  };

  bookings.unshift(booking);
  saveBookings(bookings);
  req.session.lastBooking = booking;
  delete req.session.bookingDraft;

  res.redirect(`/booking/success/${booking.id}`);
});

app.get("/booking/success/:id", authRequired, (req, res) => {
  const bookings = getBookings();
  const booking = bookings.find((entry) => entry.id === req.params.id);

  if (!booking) {
    return res.status(404).send("Booking not found");
  }

  res.render("booking-success", {
    title: "BusGo - Booking Confirmed",
    booking
  });
});

app.get("/register", (req, res) => {
  if (req.session.user) {
    return res.redirect("/");
  }

  res.render("register", { title: "BusGo - Register" });
});

app.post("/register", async (req, res) => {
  const { name, email, password } = req.body;
  const cleanName = name?.trim();
  const cleanEmail = email?.trim().toLowerCase();

  if (!cleanName || !cleanEmail || !password) {
    setFlash(req, "All register fields are required.");
    return res.redirect("/register");
  }

  const users = getUsers();
  if (users.some((user) => user.email === cleanEmail)) {
    setFlash(req, "An account already exists with that email.");
    return res.redirect("/register");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = {
    id: `USR${Date.now()}`,
    name: cleanName,
    email: cleanEmail,
    passwordHash,
    createdAt: new Date().toISOString()
  };

  users.unshift(user);
  saveUsers(users);
  req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role || "user" };
  setFlash(req, "Registration successful. You are now logged in.");
  res.redirect("/");
});

app.get("/login", (req, res) => {
  if (req.session.user) {
    return res.redirect("/");
  }

  res.render("login", { title: "BusGo - Login" });
});

app.post("/login", async (req, res) => {
  const email = req.body.email?.trim().toLowerCase();
  const password = req.body.password;
  const users = getUsers();
  const user = users.find((entry) => entry.email === email);

  if (!user || !(await bcrypt.compare(password || "", user.passwordHash))) {
    setFlash(req, "Invalid email or password.");
    return res.redirect("/login");
  }

  req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role || "user" };
  setFlash(req, `Welcome back, ${user.name}.`);
  res.redirect("/");
});

app.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

app.get("/bookings", authRequired, (req, res) => {
  const bookings = getBookings().filter((booking) => booking.userId === req.session.user.id);
  res.render("bookings", {
    title: "BusGo - My Bookings",
    bookings
  });
});

app.get("/admin", adminRequired, (req, res) => {
  res.redirect("/admin/dashboard");
});

app.get("/admin/dashboard", adminRequired, (req, res) => {
  const buses = getBuses();
  const bookings = getBookings();
  const users = getUsers();

  res.render("admin/dashboard", {
    title: "BusGo - Admin Dashboard",
    summary: {
      busCount: buses.length,
      bookingCount: bookings.length,
      userCount: users.length,
      seatCount: buses.reduce((total, bus) => total + Number(bus.seatsLeft || 0), 0)
    }
  });
});

app.get("/admin/buses", adminRequired, (req, res) => {
  res.render("admin/buses", {
    title: "BusGo - Manage Buses",
    buses: getBuses()
  });
});

app.post("/admin/buses", adminRequired, (req, res) => {
  const buses = getBuses();
  const bus = {
    id: nextBusId(buses),
    name: req.body.name?.trim(),
    type: req.body.type?.trim(),
    departure: req.body.departure?.trim(),
    arrival: req.body.arrival?.trim(),
    seatsLeft: Number(req.body.seatsLeft || 0),
    fare: Number(req.body.fare || 0),
    from: req.body.from?.trim(),
    to: req.body.to?.trim()
  };

  if (!bus.name || !bus.type || !bus.departure || !bus.arrival || !bus.from || !bus.to || Number.isNaN(bus.seatsLeft) || Number.isNaN(bus.fare)) {
    setFlash(req, "Fill all bus fields before saving.");
    return res.redirect("/admin/buses");
  }

  buses.unshift(bus);
  saveBuses(buses);
  setFlash(req, "Bus created successfully.");
  res.redirect("/admin/buses");
});

app.post("/admin/buses/:id", adminRequired, (req, res) => {
  const buses = getBuses();
  const busIndex = buses.findIndex((bus) => bus.id === Number(req.params.id));

  if (busIndex === -1) {
    setFlash(req, "Bus not found.");
    return res.redirect("/admin/buses");
  }

  buses[busIndex] = {
    ...buses[busIndex],
    name: req.body.name?.trim(),
    type: req.body.type?.trim(),
    departure: req.body.departure?.trim(),
    arrival: req.body.arrival?.trim(),
    seatsLeft: Number(req.body.seatsLeft || 0),
    fare: Number(req.body.fare || 0),
    from: req.body.from?.trim(),
    to: req.body.to?.trim()
  };

  saveBuses(buses);
  setFlash(req, "Bus updated successfully.");
  res.redirect("/admin/buses");
});

app.post("/admin/buses/:id/delete", adminRequired, (req, res) => {
  const buses = getBuses();
  const filteredBuses = buses.filter((bus) => bus.id !== Number(req.params.id));

  if (filteredBuses.length === buses.length) {
    setFlash(req, "Bus not found.");
    return res.redirect("/admin/buses");
  }

  saveBuses(filteredBuses);
  setFlash(req, "Bus deleted successfully.");
  res.redirect("/admin/buses");
});

app.get("/admin/bookings", adminRequired, (req, res) => {
  res.render("admin/bookings", {
    title: "BusGo - All Bookings",
    bookings: getBookings()
  });
});

app.use((req, res) => {
  res.status(404).render("not-found", { title: "BusGo - Not Found" });
});

app.listen(port, () => {
  console.log(`BusGo running at http://localhost:${port}`);
});
