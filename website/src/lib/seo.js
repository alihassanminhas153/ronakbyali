const SITE_URL = "https://ronakbyali.com";

export function setMeta(name, content, property = false) {
  if (!content) return;
  const attribute = property ? "property" : "name";
  let element = document.head.querySelector(`meta[${attribute}="${name}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, name);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
}

export function setCanonical(pathname = "/") {
  const url = new URL(pathname, SITE_URL).toString();
  let link = document.head.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }
  link.setAttribute("href", url);
  return url;
}

export function setJsonLd(id, data) {
  let script = document.head.querySelector(`script[data-seo="${id}"]`);
  if (!script) {
    script = document.createElement("script");
    script.type = "application/ld+json";
    script.dataset.seo = id;
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(data);
}

