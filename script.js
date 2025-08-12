// script.js
// Loads movies.json, renders UI, provides search/filter/modal
const MOVIES_JSON = "movies.json";

let movies = [];
let genresSet = new Set();
const moviesGrid = document.getElementById("moviesGrid");
const latestGrid = document.getElementById("latestGrid");
const genresWrap = document.getElementById("genres");
const searchInput = document.getElementById("searchInput");
const modal = document.getElementById("modal");

// modal elements
const modalPoster = document.getElementById("modalPoster");
const modalTitle = document.getElementById("modalTitle");
const modalDesc = document.getElementById("modalDesc");
const modalRating = document.getElementById("modalRating");
const modallanguage = document.getElementById("modallanguage");
const modallength = document.getElementById("modallength");
const modalGenres = document.getElementById("modalGenres");
const modalRelease = document.getElementById("modalRelease");
const modalLink = document.getElementById("modalLink");
document.getElementById("modalClose").addEventListener("click", closeModal);
modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });

fetch(MOVIES_JSON)
  .then(r => r.json())
  .then(data => {
    movies = data;
    buildGenreButtons();
    renderAll();
  })
  .catch(err => {
    console.error("Failed to load movies.json", err);
    moviesGrid.innerHTML = "<p style='color:#f66'>Failed to load movie list.</p>";
  });

function buildGenreButtons(){
  movies.forEach(m => (m.genres || []).forEach(g => genresSet.add(g)));
  const allBtn = createGenreButton("All");
  genresWrap.appendChild(allBtn);

  Array.from(genresSet).sort().forEach(g => {
    const btn = createGenreButton(g);
    genresWrap.appendChild(btn);
  });

  // latest filter quick button (2025)
  const latestBtn = createGenreButton("2025");
  genresWrap.appendChild(latestBtn);
}

function createGenreButton(label){
  const btn = document.createElement("button");
  btn.className = "genre-btn";
  btn.innerText = label;
  btn.onclick = () => {
    // toggle active
    Array.from(genresWrap.children).forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    filterAndRender(label === "All" ? "" : label);
  };
  return btn;
}

function filterAndRender(filter){
  const q = (searchInput.value || "").trim().toLowerCase();
  const byFilter = movieMatchesFilter(filter);
  const filtered = movies.filter(m => {
    const matchesQuery = q === "" || (m.title + " " + (m.description || "") + " " + (m.genres||[]).join(" ")).toLowerCase().includes(q);
    return byFilter(m) && matchesQuery;
  });
  renderGrid(moviesGrid, filtered);
  renderLatest(); // keep latest section synced
}

function movieMatchesFilter(filter){
  if(!filter || filter.trim()==="") return () => true;
  return (m) => (m.genres || []).map(x=>x.toLowerCase()).includes(filter.toLowerCase());
}

function renderAll(){
  renderGrid(moviesGrid, movies);
  renderLatest();
}

function renderLatest() {
  const currentYear = new Date().getFullYear(); // Saal auto detect
  const latest = movies.filter(m => 
    (m.genres || []).includes(String(currentYear)) || 
    (m.releaseDate && m.releaseDate.startsWith(String(currentYear)))
  );
  renderGrid(latestGrid, latest.slice(0, 8)); 
}

function renderGrid(container, list){
  container.innerHTML = "";
  if(list.length === 0){
    container.innerHTML = "<p style='color:var(--muted)'>No movies found.</p>";
    return;
  }
  list.forEach(movie => {
    const card = document.createElement("div");
    card.className = "card";
    const img = document.createElement("img");
    img.src = movie.poster;
    img.alt = movie.title;
    img.loading = "lazy";
    const h3 = document.createElement("h3");
    h3.innerText = movie.title;
    const meta = document.createElement("div");
    meta.className = "meta";
    meta.innerText = `${movie.releaseDate || ""} • ${movie.rating || "—"}`;
    meta.innerText = `${movie.language || "—"} • ${movie.length || "—"}`;
    card.appendChild(img);
    card.appendChild(h3);
    card.appendChild(meta);

    // click opens modal
    card.addEventListener("click", () => openModal(movie));

    container.appendChild(card);
  });
}

function openModal(movie){
  modalPoster.src = movie.poster;
  modalTitle.innerText = movie.title;
  modalDesc.innerText = movie.description || "No description available.";
  modalRating.innerText = movie.rating || "—";
  modallanguage.innerText = movie.language || "_";
  modallength.innerText = movie.length || "_"
  modalGenres.innerText = (movie.genres || []).join(", ") || "—";
  modalRelease.innerText = movie.releaseDate || "—";
  modalLink.href = movie.telegramLink || "#";
  modal.style.display = "flex";
}

function closeModal(){
  modal.style.display = "none";
}

// search input
searchInput.addEventListener("input", () => {
  // if a genre is active, keep it, otherwise filterAll
  const active = Array.from(genresWrap.children).find(b => b.classList && b.classList.contains("active"));
  const filterLabel = active ? active.innerText : "";
  filterAndRender(filterLabel === "All" ? "" : filterLabel);
});

// helper: add movie (not required; you will edit movies.json instead)
window.addMovie = function(movie){
  movies.push(movie);
  buildGenreButtons();
  renderAll();
};
