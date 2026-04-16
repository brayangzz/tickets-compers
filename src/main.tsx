import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { API_BASE_URL, LEGACY_API_BASE_URL } from "./config/api";
import { router } from "./router";
import "./index.css";
import {
  SessionExpiredModal,
  triggerSessionExpired,
} from "./components/modals/SessionExpiredModal";

const originalFetch = window.fetch;
let hasTriggeredSessionExpired = false;

const markAsNoTranslate = (element: Element | null) => {
  if (!element) return;
  element.setAttribute("translate", "no");
  element.classList.add("notranslate");
};

const protectFromAutoTranslate = () => {
  markAsNoTranslate(document.documentElement);
  markAsNoTranslate(document.body);
  markAsNoTranslate(document.getElementById("root"));

  const protectIcons = (scope: ParentNode) => {
    if (scope instanceof Element && scope.matches(".material-symbols-rounded")) {
      markAsNoTranslate(scope);
    }

    if ("querySelectorAll" in scope) {
      scope.querySelectorAll(".material-symbols-rounded").forEach((icon) => {
        markAsNoTranslate(icon);
      });
    }
  };

  protectIcons(document);

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof Element) {
          protectIcons(node);
        }
      });
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });
};

const getRequestUrl = (input: RequestInfo | URL) => {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
};

const rewriteLegacyApiBase = (url: string) => {
  if (!url.startsWith(LEGACY_API_BASE_URL)) return url;
  if (API_BASE_URL === LEGACY_API_BASE_URL) return url;
  return `${API_BASE_URL}${url.slice(LEGACY_API_BASE_URL.length)}`;
};

const rewriteRequestInput = (input: RequestInfo | URL, rewrittenUrl: string) => {
  if (typeof input === "string") return rewrittenUrl;
  if (input instanceof URL) return new URL(rewrittenUrl);
  if (input instanceof Request && rewrittenUrl !== input.url) {
    return new Request(rewrittenUrl, input);
  }
  return input;
};

protectFromAutoTranslate();

window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const originalUrl = getRequestUrl(input);
  const rewrittenUrl = rewriteLegacyApiBase(originalUrl);
  const rewrittenInput = rewriteRequestInput(input, rewrittenUrl);
  const response = await originalFetch(rewrittenInput, init);

  if (
    response.status === 401 &&
    !rewrittenUrl.includes("/login") &&
    !hasTriggeredSessionExpired
  ) {
    hasTriggeredSessionExpired = true;
    triggerSessionExpired();
  }

  return response;
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <>
      <RouterProvider router={router} />
      <SessionExpiredModal />
    </>
  </React.StrictMode>,
);
