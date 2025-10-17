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

// Fetch data
fetch(MOVIES_JSON)
  .then(r => r.json())
  .then(data => {
    movies = data;
    sortMoviesByReleaseDate(); // Sort movies by release date on load
    buildGenreButtons();
    renderAll();
    updateCounters(); // total counts (movies vs webseries)
  })
  .catch(err => {
    console.error("Failed to load movies.json", err);
    moviesGrid.innerHTML = "<p style='color:#f66'>Failed to load movie list.</p>";
  });

// Sort movies by release date (latest first)
function sortMoviesByReleaseDate() {
  movies.sort((a, b) => {
    const dateA = new Date(a.releaseDate || "1970-01-01"); // Default to old date if no releaseDate
    const dateB = new Date(b.releaseDate || "1970-01-01");
    return dateB - dateA; // Descending order (latest first)
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

  let filtered = movies.filter(m => byFilter(m));

  if (q !== "") {
    filtered = filtered.filter(m => movieMatchesQueryAdvanced(m, q));
  }

  // Sort filtered results by relevance if search query exists
  if (q !== "") {
    filtered = sortByRelevance(filtered, q);
  }

  currentPage = 1; // reset on filter/search
  renderPaginatedGrid(filtered);
}

function movieMatchesFilter(filter) {
  if (!filter || filter.trim() === "") return () => true;
  return (m) => (m.genres || []).map(x => x.toLowerCase()).includes(filter.toLowerCase())
           || (m.releaseDate && m.releaseDate.startsWith(filter));
}

// Advanced fuzzy search: prioritize exact matches, then partial
function movieMatchesQueryAdvanced(movie, query) {
  const normalizedQuery = normalizeString(query);
  const queryWords = normalizedQuery.split(' ');
  const haystack = normalizeString(movie.title + " " + (movie.description || "") + " " + (movie.genres || []).join(" "));

  // Require at least 50% of query words to match
  const matchingWords = queryWords.filter(word => haystack.includes(word)).length;
  const matchRatio = matchingWords / queryWords.length;
  return matchRatio >= 0.5; // At least 50% match
}

// Sort by relevance: higher score for more matching words and exact title match
function sortByRelevance(list, query) {
  const normalizedQuery = normalizeString(query);
  const queryWords = normalizedQuery.split(' ');

  return list.map(movie => {
    const haystack = normalizeString(movie.title + " " + (movie.description || "") + " " + (movie.genres || []).join(" "));
    const matchingWords = queryWords.filter(word => haystack.includes(word)).length;
    const exactTitleMatch = haystack.includes(normalizedQuery) ? 10 : 0; // Bonus for exact title match
    const score = matchingWords + exactTitleMatch;
    return { movie, score };
  })
  .sort((a, b) => b.score - a.score) // Descending score (best first)
  .map(item => item.movie);
}

// Normalize string: remove punctuation and lowercase
function normalizeString(str) {
  return str.toLowerCase().replace(/[^\w\s]/gi, ''); // Remove punctuation
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

  // Show disclaimer section only on page 1 (optional behavior)
  if (latestHeader) {
    const disclaimerSection = latestHeader.parentElement;
    if (disclaimerSection) disclaimerSection.style.display = (currentPage === 1) ? "" : "none";
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

        // Add 18+ tag if applicable
        if (movie.is18PlusAdult || movie.is18PlusBrutal) {
            const tag = document.createElement("div");
            tag.className = "age-tag";
            const textSpan = document.createElement("span");
            textSpan.innerText = (movie.is18PlusBrutal && !movie.is18PlusAdult) ? "☢" : "18+";
            textSpan.className = "age-text"; // For animation

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

              // Add Coming Soon tag if comingSoon is true
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
    modalWatchOnline.style.display = "none"; // Hide for series
  } else {
    modalLink.innerText = "Download";
    modalLink.href = movie.telegramLink || "#";
    modalLink.onclick = null;
    modalWatchOnline.style.display = "inline-block"; // Show for movies
  }

  // Handle "Watch Online" button
  modalWatchOnline.href = movie.watchLink || "https://filmm.me/PedI59LB"; // Use watchLink or fallback
  modalWatchOnline.innerText = "Watch Online";
  modalWatchOnline.title = "Stream this movie online"; // Tooltip for clarity

  // Add warning for 18+ content
  if (movie.is18PlusAdult && movie.is18PlusBrutal) {
    modalWarning.textContent = "Contains Adult and Brutal/Gore content (18+)";
  } else if (movie.is18PlusAdult) {
    modalWarning.textContent = "Contains Adult scenes (18+)";
  } else if (movie.is18PlusBrutal) {
    modalWarning.textContent = "Contains Brutal/Gore content (18+)";
  } else {
    modalWarning.textContent = ""; // No warning for non-18+ movies
  }

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

// Hide keyboard on Enter
searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    searchInput.blur(); // Hide keyboard on mobile
  }
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

// Helper to add a movie at runtime with correct positioning
window.addMovie = function(movie) {
  movies.push(movie);
  sortMoviesByReleaseDate(); // Sort after adding new movie
  genresSet.clear();
  genresWrap.innerHTML = "";
  buildGenreButtons();
  renderAll();
  updateCounters();
};

// ---- Voice search integration (Web Speech API) ----
// Requires existing `searchInput` element in DOM.

(function setupVoiceSearch(){
  const voiceBtn = document.getElementById("voiceSearchBtn");
  const voiceStatus = document.getElementById("voiceStatus");
  if (!voiceBtn || !searchInput) return; // safety

  // feature detect
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition || null;
  if (!SpeechRecognition) {
    // browser not supported
    voiceStatus.textContent = "Voice not supported";
    voiceBtn.disabled = true;
    voiceBtn.title = "Voice search not supported in this browser";
    return;
  }

  const recog = new SpeechRecognition();
  recog.lang = "en-IN"; // change to 'hi-IN' or 'en-US' if you prefer
  recog.interimResults = true; // show interim results
  recog.maxAlternatives = 1;
  recog.continuous = false; // keep it single-shot for UI simplicity

  let listening = false;

  function setListening(state){
    listening = !!state;
    if (listening) {
      voiceBtn.classList.add("listening");
      voiceBtn.title = "Listening... click to stop";
      voiceStatus.textContent = "Listening…";
    } else {
      voiceBtn.classList.remove("listening");
      voiceBtn.title = "Start voice search";
      // keep last result visible for a moment, or clear
      // voiceStatus.textContent = "";
    }
  }

  // click toggles start/stop
  voiceBtn.addEventListener("click", () => {
    if (listening) {
      recog.stop(); // will trigger onend
      setListening(false);
    } else {
      try {
        recog.start();
        setListening(true);
      } catch (err) {
        console.warn("SpeechRecognition start error:", err);
      }
    }
  });

  let interimTranscript = "";

  recog.onresult = (event) => {
    let finalTranscript = "";
    interimTranscript = "";

    for (let i = event.resultIndex; i < event.results.length; ++i) {
      const result = event.results[i];
      if (result.isFinal) finalTranscript += result[0].transcript;
      else interimTranscript += result[0].transcript;
    }

    // prefer finalTranscript if available; otherwise interim
    const textToUse = (finalTranscript || interimTranscript).trim();
    if (textToUse) {
      voiceStatus.textContent = textToUse.length > 40 ? textToUse.slice(0,40) + "…" : textToUse;
    }

    // If final result, write to search input and trigger search
    if (finalTranscript) {
      // fill search input
      searchInput.value = finalTranscript.trim();
      // dispatch input event so your existing listener runs (filterAndRender)
      const ev = new Event('input', { bubbles: true });
      searchInput.dispatchEvent(ev);

      // stop state
      setListening(false);
    }
  };

  recog.onerror = (e) => {
    console.warn("SpeechRecognition error", e);
    voiceStatus.textContent = "Voice error";
    setTimeout(() => {
      if (!listening) voiceStatus.textContent = "";
    }, 2000);
    setListening(false);
  };

  recog.onend = () => {
    // when recognition ends (user stopped speaking or .stop() called)
    setListening(false);
    // if there's interim transcript left and no final produced, use interim
    if (interimTranscript && !searchInput.value) {
      searchInput.value = interimTranscript.trim();
      const ev = new Event('input', { bubbles: true });
      searchInput.dispatchEvent(ev);
      voiceStatus.textContent = interimTranscript.slice(0,40) + (interimTranscript.length>40?'…':'');
    }
    // clear interim memory
    interimTranscript = "";
    setTimeout(()=>{ if (!listening) voiceStatus.textContent = ""; }, 2500);
  };

  // optional: stop listening on page hide/unload
  window.addEventListener('pagehide', () => { if (listening) recog.stop(); });

})();
