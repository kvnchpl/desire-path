function mediaElement(media) {
  if (media.type === "text") {
    const paragraph = document.createElement("p");
    paragraph.className = "encounter-text";
    paragraph.textContent = media.text;
    return paragraph;
  }

  const figure = document.createElement("figure");
  let element;
  if (media.type === "image") {
    element = document.createElement("img");
    element.alt = media.alt;
  } else {
    element = document.createElement(media.type);
    element.controls = true;
  }
  element.src = media.src;
  figure.append(element);
  element.addEventListener("error", () => {
    const fallback = document.createElement("p");
    fallback.className = "media-error";
    fallback.textContent = `This ${media.type} could not be loaded.`;
    element.replaceWith(fallback);
  }, { once: true });
  if (media.caption) {
    const caption = document.createElement("figcaption");
    caption.textContent = media.caption;
    figure.append(caption);
  }
  return figure;
}

export function renderEncounter(encounter, elements) {
  elements.title.textContent = encounter.title;
  elements.media.replaceChildren(...encounter.media.map(mediaElement));
}
