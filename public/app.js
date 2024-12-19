const socket = io(); // WebSocket bağlantısı

// Anketleri al ve ekrana göster
async function fetchPolls() {
  const response = await fetch('/api/polls'); // API'den anketleri al
  const polls = await response.json();

  const pollsContainer = document.getElementById('polls');
  pollsContainer.innerHTML = ''; // Önce eski içeriği temizle

  polls.forEach((poll) => {
    const pollDiv = document.createElement('div');
    pollDiv.className = 'poll';
    pollDiv.id = poll._id;

    // Soru ve seçenekleri ekle
    pollDiv.innerHTML = `<h2>${poll.question}</h2>`;
    poll.options.forEach((option, index) => {
      pollDiv.innerHTML += `
        <p>${option.name}: ${option.votes} oy</p>
        <button onclick="vote('${poll._id}', ${index})">Oy Ver</button>
      `;
    });

    pollsContainer.appendChild(pollDiv);
  });
}

// Oy verme işlevi
async function vote(pollId, optionIndex) {
  await fetch(`/api/polls/vote/${pollId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ optionIndex }),
  });
}

// Oy kullanıldıktan sonra sonuçları grafikle göster
function updateChart(poll) {
    const ctx = document.getElementById(`chart-${poll._id}`).getContext('2d');
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: poll.options.map((opt) => opt.name),
        datasets: [{
          label: 'Oy Sayıları',
          data: poll.options.map((opt) => opt.votes),
        }]
      }
    });
  }

// WebSocket üzerinden gerçek zamanlı güncelleme
socket.on('pollUpdated', (poll) => {
  const pollDiv = document.getElementById(poll._id);
  if (pollDiv) {
    pollDiv.innerHTML = `<h2>${poll.question}</h2>`;
    poll.options.forEach((option, index) => {
      pollDiv.innerHTML += `
        <p>${option.name}: ${option.votes} oy</p>
        <button onclick="vote('${poll._id}', ${index})">Oy Ver</button>
      `;
    });
  }
});

// Sayfa yüklendiğinde anketleri al
fetchPolls();