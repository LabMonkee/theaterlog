/*
  fetcher.js - isolated network/parser code for fetching theater shows.
  Updated to query the theater.nl "voorstellingen" page by default (more focused results),
  keep proxy fallbacks and improve parsing/fallback heuristics to increase hit rate.
*/

export async function fetchTheaterShows(query){
  // "Better Idea": Use Jina Reader as the primary tool. It converts web pages to clean Markdown,
  // making it much easier to extract structured event data regardless of the site's layout.
  
  let targetUrl = query;
  if(!query.startsWith('http')){
    // If not a URL, prefer constructing a theater.nl path.
    // Support inputs like:
    // - "culemborg/theater-de-fransche-school" (use as-is after theater.nl/)
    // - "culemborg theater de fransche school" (city + theatre words -> /city/theatre-slug)
    // - otherwise fall back to theater.nl search
    const q = String(query || '').trim();
    if(q.includes('/')){
      // assume user provided "city/theatre-slug" or full path segment
      const path = q.replace(/^\/*/, ''); // remove leading slashes
      targetUrl = `https://www.theater.nl/${path}`;
    } else {
      const parts = q.toLowerCase().split(/\s+/).filter(Boolean);
      if(parts.length >= 2){
        const city = parts[0];
        const theatreSlug = parts.slice(1).join('-').replace(/[^\w\-]/g,'');
        targetUrl = `https://www.theater.nl/${encodeURIComponent(city)}/${encodeURIComponent(theatreSlug)}`;
      } else {
        // fallback: search page
        targetUrl = `https://www.theater.nl/voorstellingen?search=${encodeURIComponent(q)}`;
      }
    }
  }

  // Jina Reader is extremely good at bypassing bot protection and returning semantic content.
  const proxyUrl = `https://r.jina.ai/${targetUrl}`;

  try {
    const res = await fetch(proxyUrl);
    if(!res.ok) throw new Error('Geen verbinding met de theater-server.');
    const markdown = await res.text();
    
    if(!markdown || markdown.trim().length < 100){
       throw new Error('Kon geen informatie ophalen. Probeer een directere URL van het theater.');
    }

    const items = [];
    const blacklist = [
      'inloggen','zakelijk','account','cookies','privacy','nieuwsbrief','vrijwilligers',
      'login','theater.nl','klantenservice','veelgestelde vragen','voorstellingen',
      'theaters','poppodia','concerten','festivals','programma','genres','musical',
      'cabaret','dance','cultuur','kindervoorstelling','schoolvoorstelling','home'
    ];

    // Regex to find likely titles in Markdown: matches header lines or bold lines that look like links
    // Example: ### [Title of Show](URL) or **Title of Show**
    const lines = markdown.split('\n');
    let currentItem = null;

    for(let i=0; i<lines.length; i++){
      const line = lines[i].trim();
      if(!line) continue;

      // 1. Look for Title (Header or Bold link)
      const titleMatch = line.match(/^(?:###|##|#)\s+(?:\[(.*?)\]|([^\[].*))$/) || line.match(/^\*\*(.*?)\*\*$/);
      if(titleMatch){
        const rawTitle = (titleMatch[1] || titleMatch[2] || '').replace(/\[|\]/g, '').trim();
        const lowT = rawTitle.toLowerCase();
        
        // Basic filtering
        if(rawTitle.length > 3 && rawTitle.length < 100 && !blacklist.some(word => lowT === word || lowT === word + 's')){
          if(currentItem && currentItem.title) items.push(currentItem);
          currentItem = { title: rawTitle, date: '', body: '', tags: [] };
          continue;
        }
      }

      // 2. Look for Date (Common patterns like "12 okt", "2023", etc.)
      if(currentItem && !currentItem.date){
        const dateMatch = line.match(/(\d{1,2}\s+(?:jan|feb|mrt|apr|mei|jun|jul|aug|sep|okt|nov|dec)[a-z]*\s*\d{0,4})/i) ||
                          line.match(/(\d{1,2}-\d{1,2}-\d{2,4})/);
        if(dateMatch){
          currentItem.date = dateMatch[1];
          continue;
        }
      }

      // 3. Look for extra info (Short snippet)
      if(currentItem && !currentItem.body && line.length > 20 && line.length < 200 && !line.startsWith('#')){
        currentItem.body = line;
      }
    }
    if(currentItem && currentItem.title) items.push(currentItem);

    // Final deduplication and cleaning
    const seen = new Set();
    return items.filter(it => {
      const key = it.title.toLowerCase();
      if(seen.has(key) || it.title.length < 4) return false;
      seen.add(key);
      return true;
    }).slice(0, 25);

  } catch(err) {
    console.error("Fetch error:", err);
    throw err;
  }
}