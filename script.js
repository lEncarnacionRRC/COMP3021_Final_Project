// Function to handle form submission
function formSubmit(event) {
    event.preventDefault();
    clearErrors();

    let result = validateForm();

    if (result.hasNoErrors) {
        document.getElementById("survey-form").submit();
    }
}

// Function to validate form inputs
function validateForm() {
    let hasNoErrors = true;
    let dataObject = {};

    // Get form elements
    const nameInput = document.getElementById("name");
    const emailInput = document.getElementById("email");
    const dateInput = document.getElementById("date");
    const fanType = document.querySelector('input[name="fan"]:checked');
    const goatSelections = document.querySelectorAll('input[name="GOAT"]:checked');
    const teamSelect = document.getElementById("favourite-team");

    // Error elements
    const nameError = document.getElementById("name-error");
    const emailError = document.getElementById("email-error");
    const dateError = document.getElementById("date-error");
    const fanError = document.getElementById("fan-error");
    const goatError = document.getElementById("goat-error");
    const teamError = document.getElementById("team-error");

    // Validate name
    if (!nameInput.value.trim()) {
        displayError(nameError, "Please enter your name");
        hasNoErrors = false;
    } else {
        dataObject.name = nameInput.value;
    }

    // Validate email
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(emailInput.value)) {
        displayError(emailError, "Please enter a valid email address");
        hasNoErrors = false;
    } else {
        dataObject.email = emailInput.value;
    }

    // Validate date
    const selectedDate = new Date(dateInput.value);
    const minDate = new Date('2024-01-01');
    const maxDate = new Date('2025-12-31');
    
    if (!dateInput.value || selectedDate < minDate || selectedDate > maxDate) {
        displayError(dateError, "Please select a date");
        hasNoErrors = false;
    } else {
        dataObject.date = selectedDate;
    }

    // Validate fan selection
    if (!fanType) {
        displayError(fanError, "What kind of fan are you?");
        hasNoErrors = false;
    } else {
        dataObject.fanType = fanType.value;
    }

    // Validate GOAT selection
    if (goatSelections.length === 0) {
        displayError(goatError, "Please select at least one GOAT");
        hasNoErrors = false;
    } else {
        dataObject.goatSelections = Array.from(goatSelections).map(cb => cb.value);
    }

    // Validate team selection
    if (teamSelect.value === "notchosen") {
        displayError(teamError, "Please select your favorite team");
        hasNoErrors = false;
    } else {
        dataObject.team = teamSelect.value;
    }

    return { hasNoErrors, dataObject };
}

// Function to display error messages
function displayError(errorElement, message) {
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
}

// Function to clear previous error messages
function clearErrors() {
    const errorElements = document.querySelectorAll(".error");
    errorElements.forEach(element => {
        element.textContent = '';
        element.style.display = 'none';
    });
}

// Set up form submission event listener
function setupEventListeners() {
    const form = document.getElementById("survey-form");
    if (form) {
        form.addEventListener("submit", formSubmit);
    }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", setupEventListeners);