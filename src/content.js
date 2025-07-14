(async function() {
  // Helper: fetch and parse HTML text into a Document
  async function fetchHTML(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch ' + url);
    const text = await res.text();
    return new DOMParser().parseFromString(text, 'text/html');
  }

  // Extract main word from a dictionary entry element
  function getEntryWord(entry) {
    // Jisho’s main word is usually in this selector:
    const wordElem = entry.querySelector('.concept_light-wrapper .text');
    return wordElem ? wordElem.textContent.trim() : null;
  }

  // Extract sentences from the fetched #sentences page document
  function extractSentences(doc) {
    // On Jisho #sentences pages, sentences are inside <div
    // class="sentence_content">
    const sentenceDivs = doc.querySelectorAll('.sentence_content');
    const sentences = [];

    for (let i = 0; i < sentenceDivs.length && i < 3; i++) {  // limit to 3
      const jp = sentenceDivs[i].querySelector('.japanese_sentence');
      const en = sentenceDivs[i].querySelector('.english_sentence');
      if (jp && en) {
        sentences.push({jp: jp.textContent.trim(), en: en.textContent.trim()});
      }
    }
    return sentences;
  }

  // Create the sentences container element with the sentences inside
  function createSentencesDiv(sentences) {
    if (!sentences.length) return null;

    const container = document.createElement('div');
    container.className = 'jisho-example-sentences';
    container.style.marginTop = '20px';  // fallback spacing
    container.style.display = 'block';

    // Insert a spacer div above sentences for guaranteed vertical spacing
    const spacer = document.createElement('div');
    spacer.style.height = '20px';
    container.appendChild(spacer);

    // Header
    const header = document.createElement('div');
    header.textContent = '🤓☝️ Example sentences:';
    header.style.fontWeight = 'bold';
    header.style.marginBottom = '8px';
    container.appendChild(header);

    sentences.forEach(s => {
      const p = document.createElement('p');

      const jpSpan = document.createElement('span');
      console.log(jpSpan);
      jpSpan.className = 'jp';
      jpSpan.textContent = s.jp;

      const br = document.createElement('br');

      const enSpan = document.createElement('span');
      enSpan.className = 'en';

      // Remove trailing "— Jreibun" or similar from the translation
      let cleanTranslation = s.en.replace(/\s*—\s*Jreibun.*$/i, '');
      enSpan.textContent = cleanTranslation;

      p.appendChild(jpSpan);
      p.appendChild(br);
      p.appendChild(enSpan);

      container.appendChild(p);
    });

    return container;
  }

  // Main logic
  const entries = document.querySelectorAll('.concept_light');

  for (const entry of entries) {
    const word = getEntryWord(entry);
    if (!word) continue;

    // Build the #sentences URL for this word, encode it properly
    const url =
        `https://jisho.org/search/${encodeURIComponent(word)}%20%23sentences`;

    try {
      const doc = await fetchHTML(url);
      const sentences = extractSentences(doc);

      if (sentences.length > 0) {
        const sentencesDiv = createSentencesDiv(sentences);
        if (sentencesDiv) {
          const wrapper = entry.querySelector(
              '.concept_light-wrapper.columns.zero-padding');
          let spacing = 100;  // fallback spacing in px
          if (wrapper) {
            spacing = wrapper.offsetHeight - 20;
          }

          const detailsLink = entry.querySelector('a.light-details_link');
          if (detailsLink) {
            // Insert spacer div right after the details link
            const spacer = document.createElement('div');
            spacer.style.height = `${spacing}px`;
            detailsLink.insertAdjacentElement('afterend', spacer);
            // Then append sentences after the spacer
            spacer.insertAdjacentElement('afterend', sentencesDiv);
          } else {
            // If no details link, just append spacer and sentences at the end
            const spacer = document.createElement('div');
            spacer.style.height = `${spacing}px`;
            entry.appendChild(spacer);
            entry.appendChild(sentencesDiv);
          }
        }
      }
    } catch (e) {
      console.warn('Error fetching sentences for:', word, e);
    }
  }
})();
