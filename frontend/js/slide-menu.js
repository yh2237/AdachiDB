const ham = document.getElementById("ham");
const menu = document.getElementById("slide-menu");
const overlay = document.getElementById("overlay");

const toggleMenu = () => {
    menu.classList.toggle("open");
    overlay.classList.toggle("show");
};

ham.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleMenu();
});

overlay.addEventListener("click", () => {
    menu.classList.remove("open");
    overlay.classList.remove("show");
});