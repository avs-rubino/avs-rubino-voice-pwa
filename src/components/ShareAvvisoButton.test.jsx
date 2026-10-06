import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ShareAvvisoButton } from "./ShareAvvisoButton";
import * as avvisoImageModule from "../services/avvisoImage";

describe("ShareAvvisoButton Component", () => {
  const dummyBlob = new Blob(["image-data"], { type: "image/png" });
  const dummyFilename = "avviso-test.png";
  const dummyText = "Testo avviso di prova";

  const originalCanShare = navigator.canShare;
  const originalShare = navigator.share;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalCanShare !== undefined) {
      Object.defineProperty(navigator, "canShare", {
        value: originalCanShare,
        configurable: true,
        writable: true,
      });
    } else {
      delete navigator.canShare;
    }
    if (originalShare !== undefined) {
      Object.defineProperty(navigator, "share", {
        value: originalShare,
        configurable: true,
        writable: true,
      });
    } else {
      delete navigator.share;
    }
  });

  it("26: click con canShare vero -> navigator.share invocato una volta", async () => {
    const shareMock = vi.fn().mockResolvedValue(undefined);
    const canShareMock = vi.fn().mockReturnValue(true);

    Object.defineProperty(navigator, "canShare", { value: canShareMock, configurable: true, writable: true });
    Object.defineProperty(navigator, "share", { value: shareMock, configurable: true, writable: true });

    render(
      <ShareAvvisoButton
        blob={dummyBlob}
        filename={dummyFilename}
        shareText={dummyText}
      />
    );

    const btn = screen.getByRole("button", { name: /condividi avviso/i });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(shareMock).toHaveBeenCalledTimes(1);
    });
  });

  it("27: click con percorso download -> compare il riscontro testuale 'Immagine scaricata'", async () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    delete navigator.canShare;

    render(
      <ShareAvvisoButton
        blob={dummyBlob}
        filename={dummyFilename}
        shareText={dummyText}
      />
    );

    const btn = screen.getByRole("button", { name: /condividi avviso/i });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(screen.getByText("Immagine scaricata")).toBeInTheDocument();
    });

    clickSpy.mockRestore();
  });

  it("28: shareAvvisoImage che rigetta -> errore inline mostrato, il componente non si smonta", async () => {
    const shareSpy = vi.spyOn(avvisoImageModule, "shareAvvisoImage").mockRejectedValueOnce(
      new Error("Download o condivisione non disponibile")
    );

    render(
      <ShareAvvisoButton
        blob={dummyBlob}
        filename={dummyFilename}
        shareText={dummyText}
      />
    );

    const btn = screen.getByRole("button", { name: /condividi avviso/i });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(screen.getByText("Download o condivisione non disponibile")).toBeInTheDocument();
    });

    // Il pulsante deve rimanere montato e utilizzabile
    expect(screen.getByRole("button", { name: /condividi avviso/i })).toBeInTheDocument();

    shareSpy.mockRestore();
  });

  it("29: [V4] Il pulsante è recuperabile con getByRole('button', { name: ... }) a conferma dell'accessibilità", () => {
    render(
      <ShareAvvisoButton
        blob={dummyBlob}
        filename={dummyFilename}
        shareText={dummyText}
      />
    );

    const btn = screen.getByRole("button", { name: "Condividi avviso social" });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveAttribute("aria-busy", "false");
  });

  it("30: render con blob valido -> visualizza l'anteprima dell'immagine con alt e src corretti", () => {
    render(
      <ShareAvvisoButton
        blob={dummyBlob}
        filename={dummyFilename}
        shareText={dummyText}
      />
    );

    const img = screen.getByAltText(/anteprima avviso/i);
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "blob:mock-url");
  });

  it("31: ciclo di vita blob -> cleanup di URL.revokeObjectURL allo smontaggio e nessun tag img se blob assente", () => {
    const { unmount } = render(
      <ShareAvvisoButton
        blob={dummyBlob}
        filename={dummyFilename}
        shareText={dummyText}
      />
    );

    expect(screen.getByAltText(/anteprima avviso/i)).toBeInTheDocument();
    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");

    render(
      <ShareAvvisoButton
        blob={null}
        filename={dummyFilename}
        shareText={dummyText}
      />
    );
    expect(screen.queryByAltText(/anteprima avviso/i)).not.toBeInTheDocument();
  });
});
