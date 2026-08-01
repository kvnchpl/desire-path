function mediaElement(media) {
  if (media.type === "text") {
    const paragraph = document.createElement("p");
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
  if (media.caption) {
    const caption = document.createElement("figcaption");
    caption.textContent = media.caption;
    figure.append(caption);
  }
  return figure;
}

export function renderEncounter(feature, elements) {
  const { properties } = feature;
  elements.title.textContent = properties.title;
  elements.media.replaceChildren(...properties.media.map(mediaElement));
  document.title = `${properties.title} — DESIRE PATH`;
}
