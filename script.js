// script.js
// Loads movies.json, renders UI, provides search/filter/modal
const MOVIES_JSON = "movies.json";

let movies = [];
let genresSet = new Set();

const moviesGrid = document.getElementById("moviesGrid");
const latestGrid = document.getElementById("latestGrid"); // Kept for reference, but not used
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
const modalWarning = document.getElementById("modalWarning");
const vpnWarning = document.getElementById("vpnWarning"); // VPN Warning

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

// Disclaimer toggle (header + content)
const latestHeader = document.getElementById("latestHeader");
const latestContent = document.getElementById("latestContent");
if (latestHeader && latestContent) {
  latestHeader.addEventListener("click", () => {
    latestHeader.classList.toggle("open");
    latestContent.classList.toggle("open");
  });
}

// ✅ Fetch data from both movies.json and xtramovie.json
Promise.all([
  fetch("movies.json").then(r => r.json()).catch(() => []),
  fetch("xtramovie.json").then(r => r.json()).catch(() => [])
])
.then(([mainMovies, extraMovies]) => {
  movies = [...mainMovies, ...extraMovies]; // merge both lists
  sortMoviesByReleaseDate(); // Sort movies by release date on load
  buildGenreButtons();
  renderAll();
  updateCounters(); // total counts (movies vs webseries)
})
.catch(err => {
  console.error("Failed to load JSON files", err);
  moviesGrid.innerHTML = "<p style='color:#26fff8'>In Maintaince - Updating Website or Adding New Features.</p>";
});

// Sort movies by release date (latest first)
function sortMoviesByReleaseDate() {
  movies.sort((a, b) => {
    const dateA = new Date(a.releaseDate || "1970-01-01");
    const dateB = new Date(b.releaseDate || "1970-01-01");
    return dateB - dateA;
  });
}

// Build genre buttons
function buildGenreButtons() {
  movies.forEach(m => (m.genres || []).forEach(g => genresSet.add(g)));

  const allBtn = createGenreButton("All");
  genresWrap.appendChild(allBtn);

  Array.from(genresSet).sort().forEach(g => {
    const btn = createGenreButton(g);
    genresWrap.appendChild(btn);
  });

  const yearBtn = createGenreButton(new Date().getFullYear().toString());
  genresWrap.appendChild(yearBtn);

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

  let filtered = movies.filter(m => byFilter(m));

  if (q !== "") {
    filtered = filtered.filter(m => movieMatchesQueryAdvanced(m, q));
  }

  if (q !== "") {
    filtered = sortByRelevance(filtered, q);
  }

  currentPage = 1;
  renderPaginatedGrid(filtered);
}

function movieMatchesFilter(filter) {
  if (!filter || filter.trim() === "") return () => true;
  return (m) => (m.genres || []).map(x => x.toLowerCase()).includes(filter.toLowerCase())
           || (m.releaseDate && m.releaseDate.startsWith(filter));
}

function movieMatchesQueryAdvanced(movie, query) {
  const normalizedQuery = normalizeString(query);
  const queryWords = normalizedQuery.split(' ');
  const haystack = normalizeString(movie.title + " " + (movie.description || "") + " " + (movie.genres || []).join(" "));
  const matchingWords = queryWords.filter(word => haystack.includes(word)).length;
  const matchRatio = matchingWords / queryWords.length;
  return matchRatio >= 0.5;
}

function sortByRelevance(list, query) {
  const normalizedQuery = normalizeString(query);
  const queryWords = normalizedQuery.split(' ');

  return list.map(movie => {
    const haystack = normalizeString(movie.title + " " + (movie.description || "") + " " + (movie.genres || []).join(" "));
    const matchingWords = queryWords.filter(word => haystack.includes(word)).length;
    const exactTitleMatch = haystack.includes(normalizedQuery) ? 10 : 0;
    const score = matchingWords + exactTitleMatch;
    return { movie, score };
  })
  .sort((a, b) => b.score - a.score)
  .map(item => item.movie);
}

function normalizeString(str) {
  return str.toLowerCase().replace(/[^\w\s]/gi, '');
}

function renderAll() {
  currentPage = 1;
  renderPaginatedGrid(movies);
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

  if (latestHeader) {
    const disclaimerSection = latestHeader.parentElement;
    if (disclaimerSection) disclaimerSection.style.display = (currentPage === 1) ? "" : "none";
  }

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

    if (movie.is18PlusAdult || movie.is18PlusBrutal) {
      const tag = document.createElement("div");
      tag.className = "age-tag";
      const textSpan = document.createElement("span");
      textSpan.innerText = (movie.is18PlusBrutal && !movie.is18PlusAdult) ? "☢" : "18+";
      textSpan.className = "age-text";

      if (movie.is18PlusAdult && movie.is18PlusBrutal) {
        tag.classList.add("age-both");
      } else if (movie.is18PlusAdult) {
        tag.classList.add("age-adult");
      } else if (movie.is18PlusBrutal) {
        tag.classList.add("age-brutal");
      }

      tag.appendChild(textSpan);
      card.appendChild(tag);
    }

    if (movie.comingSoon) {
      const comingSoonTag = document.createElement("div");
      comingSoonTag.className = "coming-soon-tag";
      const comingSoonText = document.createElement("span");
      comingSoonText.innerText = "Coming Soon";
      comingSoonTag.appendChild(comingSoonText);
      card.appendChild(comingSoonTag);
    }

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
// Episodes count for webseries only
const episodeElement = document.getElementById("modalEpisodes");
const episodeCountSpan = document.getElementById("episodeCount");
if (movie.type && movie.type.toLowerCase() === "series" && movie.episodeCount) {
  episodeCountSpan.textContent = movie.episodeCount;
  episodeElement.style.display = "list-item";
} else {
  episodeElement.style.display = "none";
}
  const langText = Array.isArray(movie.language) ? movie.language.join(", ") : (movie.language || "");
  modalLanguage.innerText = langText || "—";
  modalLength.innerText = movie.length || "—";

  if (movie.type && movie.type.toLowerCase() === "series") {
    modalLink.innerText = "View Episodes";
    modalLink.href = "#";
    modalLink.onclick = (e) => {
      e.preventDefault();
      openEpisodesModal(movie);
    };
    modalWatchOnline.style.display = "none";
  } else {
    modalLink.innerText = "Download";
    modalLink.href = movie.telegramLink || "#";
    modalLink.onclick = null;
    modalWatchOnline.style.display = "inline-block";
  }

  modalWatchOnline.href = movie.watchLink || "https://filmm.me/PedI59LB";
  modalWatchOnline.innerText = "Watch Online";
  modalWatchOnline.title = "Stream this movie online";

  if (movie.is18PlusAdult && movie.is18PlusBrutal) {
    modalWarning.textContent = "Contains Adult and Brutal/Gore content (18+)";
  } else if (movie.is18PlusAdult) {
    modalWarning.textContent = "Contains Adult scenes (18+)";
  } else if (movie.is18PlusBrutal) {
    modalWarning.textContent = "Contains Brutal/Gore content (18+)";
  } else {
    modalWarning.textContent = "";
  }
    // VPN WARNING — SHOW/HIDE
  vpnWarning.style.display = movie.useVpn === true ? "block" : "none";

  modal.style.display = "flex";
}

function closeModal() { modal.style.display = "none"; }

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

function closeEpisodesModal() { episodesModal.style.display = "none"; }

// Search input
searchInput.addEventListener("input", () => {
  const active = Array.from(genresWrap.children).find(b => b.classList && b.classList.contains("active"));
  const filterLabel = active ? active.innerText : "";
  filterAndRender(filterLabel === "All" ? "" : filterLabel);
});

// Hide keyboard on Enter
searchInput.addEventListener("keydown", (e) => { if (e.key === "Enter") searchInput.blur(); });

// Movies + Webseries counters
function updateCounters() {
  const movieCount = movies.filter(m => !m.type || m.type.toLowerCase() !== "series").length;
  const webseriesCount = movies.filter(m => m.type && m.type.toLowerCase() === "series").length;
  const movieCounterEl = document.getElementById("movieCount");
  const webseriesCounterEl = document.getElementById("webseriesCount");
  if (movieCounterEl) movieCounterEl.innerText = `Movies: ${movieCount}`;
  if (webseriesCounterEl) webseriesCounterEl.innerText = `Webseries: ${webseriesCount}`;
}

// Add movie at runtime
window.addMovie = function(movie) {
  movies.push(movie);
  sortMoviesByReleaseDate();
  genresSet.clear();
  genresWrap.innerHTML = "";
  buildGenreButtons();
  renderAll();
  updateCounters();
};


// ===================== 🎤 Voice Search Integration =====================
(function setupVoiceSearchSafe(){
  try {
    const voiceBtn = document.getElementById("voiceSearchBtn");
    const voiceStatus = document.getElementById("voiceStatus");
    if (!searchInput || !voiceBtn || !voiceStatus) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      voiceStatus.textContent = "Voice not supported";
      voiceBtn.disabled = true;
      return;
    }

    const recog = new SpeechRecognition();
    recog.lang = "en-IN";
    recog.interimResults = true;
    recog.continuous = false;

    let listening = false;

    function setListening(state){
      listening = state;
      voiceBtn.classList.toggle("listening", state);
      voiceStatus.textContent = state ? "Listening…" : "";
    }

    voiceBtn.addEventListener("click", () => {
      if (listening) { recog.stop(); setListening(false); }
      else { recog.start(); setListening(true); }
    });

    recog.onresult = (e) => {
      let text = "";
      for (let i = e.resultIndex; i < e.results.length; ++i) {
        text += e.results[i][0].transcript;
      }
      searchInput.value = text.trim();
      searchInput.dispatchEvent(new Event("input"));
    };

    recog.onend = () => setListening(false);
    recog.onerror = () => setListening(false);

  } catch(err) { console.error("Voice search setup failed:", err); }
})();

// Episode names 
function openEpisodesModal(series) {
  seriesName.innerText = series.title || "Untitled Series";
  episodesList.innerHTML = "";
  const links = series.episodeLinks || [];
  const episodeNames = series.episodeNames || links.map((_, index) => `Episode ${index + 1}`); // Fallback to numbered episodes

  const itemsPerPage = 5;
  let currentPage = 1;

  function renderEpisodes(page) {
    episodesList.innerHTML = "";
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageLinks = links.slice(start, end);
    const pageNames = episodeNames.slice(start, end);

    pageLinks.forEach((link, index) => {
      const episodeIndex = start + index;
      const li = document.createElement("div");
      li.className = "episode-item";

      const episodeNum = document.createElement("span");
      episodeNum.className = "episode-num";
      episodeNum.textContent = `Episode ${episodeIndex + 1}`;

      const episodeName = document.createElement("span");
      episodeName.className = "episode-name";
      episodeName.textContent = pageNames[index] || `Episode ${episodeIndex + 1}`;

      const getButton = document.createElement("a");
      getButton.className = "episode-get";
      getButton.href = link || "#";
      getButton.target = "_blank";
      getButton.rel = "noopener";
      getButton.textContent = "Get";

      li.appendChild(episodeNum);
      li.appendChild(episodeName);
      li.appendChild(getButton);
      episodesList.appendChild(li);
    });

    // Pagination
    const totalPages = Math.ceil(links.length / itemsPerPage);
    const paginationDiv = document.createElement("div");
    paginationDiv.className = "episode-pagination";

    if (currentPage > 1) {
      const prevButton = document.createElement("button");
      prevButton.textContent = "Prev";
      prevButton.className = "episode-prev";
      prevButton.onclick = () => {
        currentPage--;
        renderEpisodes(currentPage);
      };
      paginationDiv.appendChild(prevButton);
    }

    if (currentPage < totalPages) {
      const nextButton = document.createElement("button");
      nextButton.textContent = "Next";
      nextButton.className = "episode-next";
      nextButton.onclick = () => {
        currentPage++;
        renderEpisodes(currentPage);
      };
      paginationDiv.appendChild(nextButton);
    }

    episodesList.appendChild(paginationDiv);
  }

  renderEpisodes(currentPage);
  episodesModal.style.display = "flex";
}

function closeEpisodesModal() { episodesModal.style.display = "none"; }

// [Rest of the existing code remains the same]
