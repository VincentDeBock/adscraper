// Limits how many ad-creative requests run at once. Each /media call spins up a
// headless browser render server-side, so firing 50 at once overwhelms it and
// everything stalls. We cap concurrency and queue the rest (FIFO).

const MAX_CONCURRENT = 3;
let active = 0;
const queue = [];

function pump() {
  while (active < MAX_CONCURRENT && queue.length) {
    const job = queue.shift();
    active++;
    fetch(job.url)
      .then((r) => (r.ok ? r.json() : null))
      .then(job.resolve, job.reject)
      .finally(() => {
        active--;
        pump();
      });
  }
}

// Returns a promise for the /media JSON, throttled through the shared queue.
// The optional `signal` lets a card drop out of the queue if it unmounts.
export function fetchMedia(url, signal) {
  return new Promise((resolve, reject) => {
    const job = { url, resolve, reject };
    if (signal) {
      if (signal.aborted) return reject(new DOMException("aborted", "AbortError"));
      signal.addEventListener(
        "abort",
        () => {
          const i = queue.indexOf(job);
          if (i >= 0) {
            queue.splice(i, 1);
            reject(new DOMException("aborted", "AbortError"));
          }
        },
        { once: true }
      );
    }
    queue.push(job);
    pump();
  });
}
