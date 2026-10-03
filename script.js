const seatGrid = document.getElementById("seatGrid");
const selectedSeatCount = document.getElementById("selectedSeatCount");
const totalFare = document.getElementById("totalFare");

if (seatGrid && selectedSeatCount && totalFare) {
  const seatPrice = 899;

  const updateSummary = () => {
    const selectedSeats = seatGrid.querySelectorAll(".seat.selected").length;
    selectedSeatCount.textContent = String(selectedSeats);
    totalFare.textContent = String(selectedSeats * seatPrice);
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
