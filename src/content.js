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

    const maxSentences = 3;
    for (let i = 0; i < sentenceDivs.length && i < maxSentences; i++) {
      const japaneseList = sentenceDivs[i].querySelector('.japanese_sentence');
      if (!japaneseList) continue;

      // Extract Japanese sentence with furigana (if available) & kanji
      const jp = extractJapaneseSentenceWithFurigana(japaneseList);
      const en = sentenceDivs[i].querySelector('.english_sentence');
      if (jp && en) {
        // Create a sentence object with both Japanese and English parts
        sentences.push({jp: jp.trim(), en: en.textContent.trim()});
      }
    }
    return sentences;
  }

  function extractJapaneseSentenceWithFurigana(ulElement) {
    let sentence = '';

    // Start by adding any text nodes directly under <ul> (before first <li>)
    ulElement.childNodes.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        sentence += node.textContent;
      } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'LI') {
        const unlinked = node.querySelector('.unlinked');
        const furigana = node.querySelector('.furigana');

        if (unlinked && furigana) {
          const kanji = unlinked.textContent.trim();
          const furi = furigana.textContent.trim();

          sentence += `<ruby>${kanji}<rt>${furi}</rt></ruby>`;
        } else if (unlinked) {
          sentence += unlinked.textContent.trim();
        }
      }
    });

    return sentence;
  }

  // Create the sentences container element with the sentences inside
  function createSentencesDiv(sentences, word) {
    if (!sentences.length) return null;

    const container = document.createElement('div');
    container.className = 'jisho-example-sentences';

    // Spacer
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

      // Japanese sentence with possible highlight
      const jpSpan = document.createElement('span');
      jpSpan.className = 'jp japanese-sentence';

      if (word) {
        const escapedWord =
            word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');  // escape regex
        const regex = new RegExp(escapedWord, 'g');
        jpSpan.innerHTML =
            s.jp.replace(regex, `<span class="highlighted">${word}</span>`);
      } else {
        jpSpan.innerHTML = s.jp;
      }

      // English translation
      const enSpan = document.createElement('span');
      enSpan.className = 'en';
      enSpan.textContent = s.en.replace(/\s*[—–-].*$/, '');

      p.appendChild(jpSpan);
      p.appendChild(document.createElement('br'));
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
        const sentencesDiv = createSentencesDiv(sentences, word);
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
