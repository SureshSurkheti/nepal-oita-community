// main.js

// Highlight the active navbar link based on current page
document.addEventListener("DOMContentLoaded", () => {
  const links = document.querySelectorAll("nav ul li a");
  links.forEach(link => {
    if (link.href === window.location.href) {
      link.classList.add("active");
    }
  });
});

// Optional: Smooth scroll for anchor links (if you add them)
const scrollLinks = document.querySelectorAll('a[href^="#"]');
scrollLinks.forEach(link => {
  link.addEventListener("click", function(e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute("href"));
    if (target) {
      target.scrollIntoView({ behavior: "smooth" });
    }
  });
});

// Optional: Add shadow effect to cards with .card-hover class
const cards = document.querySelectorAll(".card-hover");
cards.forEach(card => {
  card.addEventListener("mouseenter", () => card.classList.add("shadow-lg"));
  card.addEventListener("mouseleave", () => card.classList.remove("shadow-lg"));
});
