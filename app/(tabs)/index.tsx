import React, { useEffect, useRef } from "react";

export default function HomeScreen() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewerRef = useRef<any>(null);

  // detect web runtime (avoid running DOM / skinview3d in Expo Go / native)
  const isWeb = typeof window !== "undefined" && typeof document !== "undefined";

  useEffect(() => {
    if (!isWeb) return; // do nothing on native / expo-go

    let mounted = true;
    if (!canvasRef.current) return;

    (async () => {
      // dynamic import so this runs only in the browser
      const skinview3d = await import("skinview3d");
      if (!mounted || !canvasRef.current) return;

      const canvas = canvasRef.current!;
      const viewer = new skinview3d.SkinViewer({
        canvas,
        width: 400,
        height: 400,
      });

      viewerRef.current = viewer;

      // use https skin URL
      const skinUrl =
        "https://textures.minecraft.net/texture/7fd9ba42a7c81eeea22f1524271ae85a8e045ce0af5a6ae16c6406ae917e68b5";

      // load skin
      try {
        await viewer.loadSkin(skinUrl);
      } catch (e) {
        console.error("Failed to load skin", e);
      }

      // configure controls / rotation (enable user rotation; fallback to pointer-drag if controls missing)
      try {
        if (viewer.controls) {
          viewer.controls.enabled = true;
          if ("autoRotate" in viewer.controls) (viewer.controls as any).autoRotate = false;
        } else {
          // fallback: implement simple pointer-drag rotation on the canvas
          let dragging = false;
          let lastX = 0;
          let lastY = 0;
          const canvasEl = canvas;

          const onDown = (e: any) => {
            dragging = true;
            lastX = e.clientX;
            lastY = e.clientY;
            try {
              canvasEl.setPointerCapture?.(e.pointerId);
            } catch {}
          };

          const onMove = (e: any) => {
            if (!dragging) return;
            const dx = e.clientX - lastX;
            const dy = e.clientY - lastY;
            lastX = e.clientX;
            lastY = e.clientY;
            if (viewer.scene && viewer.scene.rotation) {
              viewer.scene.rotation.y -= dx * 0.01;
              viewer.scene.rotation.x = Math.max(
                -Math.PI / 2,
                Math.min(Math.PI / 2, viewer.scene.rotation.x - dy * 0.01)
              );
            }
            viewer.render?.();
          };

          const onUp = (e: any) => {
            dragging = false;
            try {
              canvasEl.releasePointerCapture?.(e.pointerId);
            } catch {}
          };

          canvasEl.addEventListener("pointerdown", onDown);
          window.addEventListener("pointermove", onMove);
          window.addEventListener("pointerup", onUp);

          (viewer as any).__customRotationHandlers = { onDown, onMove, onUp };
        }

        if (viewer.scene && viewer.scene.rotation) {
          viewer.scene.rotation.set(0, 0, 0);
        }
        if (viewer.camera && viewer.camera.position) {
          viewer.camera.position.set(0, 0, 50);
          viewer.camera.lookAt(viewer.scene.position);
        }
      } catch (e) {
        console.warn("Could not fully configure controls/animations:", e);
      }
    })();

    return () => {
      mounted = false;
      if (viewerRef.current) {
        try {
          const v = viewerRef.current as any;
          const handlers = v?.__customRotationHandlers;
          if (handlers && canvasRef.current) {
            canvasRef.current.removeEventListener("pointerdown", handlers.onDown);
            window.removeEventListener("pointermove", handlers.onMove);
            window.removeEventListener("pointerup", handlers.onUp);
          }
          v.dispose?.();
        } catch {}
        viewerRef.current = null;
      }
    };
  }, [isWeb]);

  if (!isWeb) {
    // avoid rendering DOM canvas / skinview3d when opened in Expo Go (native)
    return (
      <>
        <div
          id="pageHeader"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            height: 64,
            backgroundColor: "#ccc",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            zIndex: 1000,
          }}
        >
        
        </div>

        <div style={{ paddingTop: 64, paddingLeft: 24, paddingRight: 24 }}>
          <div style={{ marginTop: 24 }}>
            <div style={{ padding: 24, background: "#fff", borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }}>
              This view is only available on web. Open the app in a browser (expo web) to see the skin viewer.
            </div>
          </div>
        </div>
      </>
    );
  }

  // web / browser rendering (original layout, canvas shown)
  return (
    <>
      <div
        id="pageHeader"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: 64,
          backgroundColor: "#ccc",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          zIndex: 1000,
        }}
      >
        <label style={{ fontSize: 24, fontWeight: "bold", marginLeft: 50, lineHeight: "64px", fontFamily: "sans-serif", color: "#333" }}>
          Proyecto API Minecraft
        </label>
      </div>

      <div style={{ paddingTop: 64, paddingLeft: 24, paddingRight: 24 }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 24,
            marginTop: 24,
          }}
        >
          <div>
            <canvas
              ref={canvasRef}
              style={{
                width: 400,
                height: 400,
                borderStyle: "solid",
                borderWidth: 2,
                borderColor: "black",
                display: "block",
              }}
            />
          </div>

          <div
            role="region"
            aria-label="Search card"
            style={{
              width: 320,
              background: "#fff",
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              borderRadius: 8,
              padding: 16,
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Search</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="search"
                placeholder="Search..."
                style={{
                  flex: 1,
                  padding: "8px 10px",
                  borderRadius: 6,
                  border: "1px solid #ccc",
                  outline: "none",
                }}
              />
              <button
                type="button"
                style={{
                  padding: "8px 12px",
                  borderRadius: 6,
                  border: "none",
                  background: "#1976d2",
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                Go
              </button>
            </div>

            <div style={{ marginTop: 12, color: "#666", fontSize: 13 }}>
              Enter a username or skin ID to look up a skin.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

