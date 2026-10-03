const seatGrid = document.getElementById("seatGrid");
const selectedSeatCount = document.getElementById("selectedSeatCount");
const totalFare = document.getElementById("totalFare");
const selectedSeatsInput = document.getElementById("selectedSeatsInput");
const seatCountInput = document.getElementById("seatCountInput");
const bookingFareInput = document.getElementById("bookingFareInput");
const bookingForm = document.getElementById("seatSelectionForm");

if (seatGrid && selectedSeatCount && totalFare) {
  const seatPrice = Number(seatGrid.dataset.fare || 899);

  const updateSummary = () => {
    const selectedSeats = Array.from(seatGrid.querySelectorAll(".seat.selected")).map((seat) => seat.dataset.seat);
    selectedSeatCount.textContent = String(selectedSeats.length);
    totalFare.textContent = String(selectedSeats.length * seatPrice);

    if (selectedSeatsInput) {
      selectedSeatsInput.value = selectedSeats.join(",");
    }

    if (seatCountInput) {
      seatCountInput.value = String(selectedSeats.length);
    }

    if (bookingFareInput) {
      bookingFareInput.value = String(selectedSeats.length * seatPrice);
    }
  };

  seatGrid.addEventListener("click", (event) => {
    const button = event.target.closest(".seat");
    if (!button || button.classList.contains("booked")) {
      return;
    }

    button.classList.toggle("selected");
    updateSummary();
  });

  updateSummary();
}

if (bookingForm && seatGrid) {
  bookingForm.addEventListener("submit", (event) => {
    const selectedSeats = Array.from(seatGrid.querySelectorAll(".seat.selected"));
    if (selectedSeats.length === 0) {
      alert("Select at least one seat to continue.");
      event.preventDefault();
    }
  });
}
