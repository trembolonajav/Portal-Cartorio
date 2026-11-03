import { beforeEach, describe, expect, it } from "vitest";
import { getStoredAuth, setStoredAuth } from "@/lib/auth";

describe("inventory authentication precedence", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    document.cookie = "cart_rio_auth=; Max-Age=0; path=/";
  });

  it("prefers the explicit PWA login over a shared Portal cookie", () => {
    document.cookie = `cart_rio_auth=${encodeURIComponent("Basic cookie-antigo")}; path=/`;
    setStoredAuth({ username: "estagiario", token: "Basic login-explicito" }, false);

    expect(getStoredAuth()).toEqual({
      username: "estagiario",
      token: "Basic login-explicito",
    });
  });

  it("uses the Portal cookie only when the PWA has no explicit login", () => {
    document.cookie = `cart_rio_auth=${encodeURIComponent("Basic cookie-portal")}; path=/`;

    expect(getStoredAuth()).toEqual({
      username: "portal",
      token: "Basic cookie-portal",
    });
  });
});
