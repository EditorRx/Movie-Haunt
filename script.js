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
const pagination = document.getElementById("pagination");

// modal elements
const modalPoster = document.getElementById("modalPoster");
const modalTitle = document.getElementById("modalTitle");
const modalDesc = document.getElementById("modalDesc");
const modalRating = document.getElementById("modalRating");
const modalLanguage = document.getElementById("modalLanguage");
const modalLength = document.getElementById("modalLength");
const modalGenres = document.getElementById("modalGenres");
const modalRelease = document.getElementById("modalRelease");
const modalLink = document.getElementById("modalLink");
const modalWatchOnline = document.getElementById("modalWatchOnline");

// episodes modal elements
const episodesModal = document.getElementById("episodesModal");
const episodesTitle = document.getElementById("episodesTitle");
const seriesName = document.getElementById("seriesName");
const episodesList = document.getElementById("episodesList");
const episodesModalClose = document.getElementById("episodesModalClose");

// close buttons
document.getElementById("modalClose").addEventListener("click", closeModal);
modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });

episodesModalClose.addEventListener("click", closeEpisodesModal);
episodesModal.addEventListener("click", (e) => { if (e.target === episodesModal) closeEpisodesModal(); });

// Latest toggle (header + content)
const latestHeader = document.getElementById("latestHeader");
const latestContent = document.getElementById("latestContent");
if (latestHeader && latestContent) {
  latestHeader.addEventListener("click", () => {
    latestHeader.classList.toggle("open");
    latestContent.classList.toggle("open");
  });
}

// Fetch data
fetch(MOVIES_JSON)
  .then(r => r.json())
  .then(data => {
    movies = data;
    buildGenreButtons();
    renderAll();
    updateCounters(); // total counts (movies vs webseries)
  })
  .catch(err => {
    console.error("Failed to load movies.json", err);
    moviesGrid.innerHTML = "<p style='color:#f66'>Failed to load movie list.</p>";
  });

// Build genre buttons
function buildGenreButtons() {
  movies.forEach(m => (m.genres || []).forEach(g => genresSet.add(g)));

  const allBtn = createGenreButton("All");
  genresWrap.appendChild(allBtn);

  Array.from(genresSet).sort().forEach(g => {
    const btn = createGenreButton(g);
    genresWrap.appendChild(btn);
  });

  // Optional: quick button for current year
  const yearBtn = createGenreButton(new Date().getFullYear().toString());
  genresWrap.appendChild(yearBtn);

  // Mark "All" active initially
  allBtn.classList.add("active");
}

function createGenreButton(label) {
  const btn = document.createElement("button");
  btn.className = "genre-btn";
  btn.innerText = label;
  btn.onclick = () => {
    Array.from(genresWrap.children).forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    filterAndRender(label === "All" ? "" : label);
  };
  return btn;
}

let currentPage = 1;
const itemsPerPage = 20;

function filterAndRender(filter) {
  const q = (searchInput.value || "").trim().toLowerCase();
  const byFilter = movieMatchesFilter(filter);

  const filtered = movies.filter(m => {
    const haystack = (m.title + " " + (m.description || "") + " " + (m.genres || []).join(" ")).toLowerCase();
    const matchesQuery = q === "" || haystack.includes(q);
    return byFilter(m) && matchesQuery;
  });

  currentPage = 1; // reset on filter/search
  renderPaginatedGrid(filtered);
  renderLatest();  // keep latest section content in sync
}

function movieMatchesFilter(filter) {
  if (!filter || filter.trim() === "") return () => true;
  return (m) => (m.genres || []).map(x => x.toLowerCase()).includes(filter.toLowerCase())
           || (m.releaseDate && m.releaseDate.startsWith(filter));
}

function renderAll() {
  currentPage = 1;
  renderPaginatedGrid(movies);
  renderLatest();
}

// Latest (current year) grid — top 8
function renderLatest() {
  const currentYear = new Date().getFullYear().toString();
  const latest = movies.filter(m =>
    (m.genres || []).includes(currentYear) ||
    (m.releaseDate && m.releaseDate.startsWith(currentYear))
  );
  renderGrid(latestGrid, latest.slice(0, 8));
}

function renderPaginatedGrid(list) {
  pagination.innerHTML = "";

  if (list.length === 0) {
    moviesGrid.innerHTML = "<p style='color:var(--muted)'>No movies found.</p>";
  }

  const totalPages = Math.max(1, Math.ceil(list.length / itemsPerPage));
  if (currentPage > totalPages) currentPage = totalPages;

  const start = (currentPage - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  const pageItems = list.slice(start, end);

  renderGrid(moviesGrid, pageItems);

  // Show latest section only on page 1
  if (latestHeader) {
    const latestSection = latestHeader.parentElement;
    if (latestSection) latestSection.style.display = (currentPage === 1) ? "" : "none";
  }

  // Pagination controls
  const prevButton = createPageButton("Prev", () => {
    if (currentPage > 1) {
      currentPage--;
      renderPaginatedGrid(list);
    }
  });
  pagination.appendChild(prevButton);

  for (let i = 1; i <= totalPages; i++) {
    const pageButton = createPageButton(i, () => {
      currentPage = i;
      renderPaginatedGrid(list);
    });
    if (i === currentPage) pageButton.classList.add("active");
    pagination.appendChild(pageButton);
  }

  const nextButton = createPageButton("Next", () => {
    if (currentPage < totalPages) {
      currentPage++;
      renderPaginatedGrid(list);
    }
  });
  pagination.appendChild(nextButton);
}

function createPageButton(label, onClick) {
  const btn = document.createElement("button");
  btn.className = "page-btn";
  btn.innerText = label;
  btn.onclick = onClick;
  return btn;
}

function renderGrid(container, list) {
  container.innerHTML = "";
  if (list.length === 0) {
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

    card.appendChild(img);
    card.appendChild(h3);
    card.appendChild(meta);

    card.addEventListener("click", () => openModal(movie));

    container.appendChild(card);
  });
}

function openModal(movie) {
  modalPoster.src = movie.poster || "placeholder.jpg";
  modalTitle.innerText = movie.title || "Untitled";
  modalDesc.innerText = movie.description || "No description available.";
  modalRating.innerText = movie.rating || "—";
  modalGenres.innerText = (movie.genres || []).join(", ") || "—";
  modalRelease.innerText = movie.releaseDate || "—";

  const langText = Array.isArray(movie.language) ? movie.language.join(", ") : (movie.language || "");
  modalLanguage.innerText = langText || "—";
  modalLength.innerText = movie.length || "—";

  // Handle "Open on Telegram" or "View Episodes"
  if (movie.type && movie.type.toLowerCase() === "series") {
    modalLink.innerText = "View Episodes";
    modalLink.href = "#";
    modalLink.onclick = (e) => {
      e.preventDefault();
      openEpisodesModal(movie);
    };
    // Comment out the next line if you want "Watch Online" to appear for series
    modalWatchOnline.style.display = "none"; // Hide for series
  } else {
    modalLink.innerText = "Open on Telegram";
    modalLink.href = movie.telegramLink || "#";
    modalLink.onclick = null;
    modalWatchOnline.style.display = "inline-block"; // Show for movies
  }

  // Handle "Watch Online" button
  modalWatchOnline.href = movie.watchLink || "https://filmm.me/PedI59LB"; // Use watchLink or fallback
  modalWatchOnline.innerText = "Watch Online";
  modalWatchOnline.title = "Stream this movie online"; // Tooltip for clarity

  modal.style.display = "flex";
}

function closeModal() {
  modal.style.display = "none";
}

function openEpisodesModal(series) {
  seriesName.innerText = series.title || "Untitled Series";
  episodesList.innerHTML = "";

  const links = series.episodeLinks || [];
  links.forEach((link, index) => {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.innerText = `Episode ${index + 1}`;
    a.href = link || "#";
    a.target = "_blank";
    a.rel = "noopener";
    li.appendChild(a);
    episodesList.appendChild(li);
  });

  episodesModal.style.display = "flex";
}

function closeEpisodesModal() {
  episodesModal.style.display = "none";
}

// Search input
searchInput.addEventListener("input", () => {
  const active = Array.from(genresWrap.children).find(b => b.classList && b.classList.contains("active"));
  const filterLabel = active ? active.innerText : "";
  filterAndRender(filterLabel === "All" ? "" : filterLabel);
});

// Movies + Webseries counters
function updateCounters() {
  const movieCount = movies.filter(m => !m.type || m.type.toLowerCase() !== "series").length;
  const webseriesCount = movies.filter(m => m.type && m.type.toLowerCase() === "series").length;

  const movieCounterEl = document.getElementById("movieCount");
  const webseriesCounterEl = document.getElementById("webseriesCount");

  if (movieCounterEl) movieCounterEl.innerText = `Movies: ${movieCount}`;
  if (webseriesCounterEl) webseriesCounterEl.innerText = `Webseries: ${webseriesCount}`;
}

// Helper to add a movie at runtime
window.addMovie = function(movie) {
  movies.push(movie);
  genresSet.clear();
  genresWrap.innerHTML = "";
  buildGenreButtons();
  renderAll();
  updateCounters();
};
