"""Computer-vision feature extraction (OpenCV).

Takes a BGR image (an EIC visual frame) and returns a JSON-serializable dict
of feature families describing color, brightness, texture, spatial layout and
frequency content. These features are the *only* bridge between sight and
sound in Terra Jukebox — see sonify.py for the mapping.
"""

import cv2
import numpy as np

GRID = 8  # spatial grid is GRID x GRID


def _norm_hist(hist: np.ndarray) -> list[float]:
    total = float(hist.sum())
    if total <= 0:
        return [0.0] * len(hist)
    return (hist / total).astype(float).tolist()


def extract_features(img_bgr: np.ndarray) -> dict:
    if img_bgr is None or img_bgr.size == 0:
        raise ValueError("empty image")
    h, w = img_bgr.shape[:2]

    hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)
    h_ch, s_ch, v_ch = hsv[:, :, 0], hsv[:, :, 1], hsv[:, :, 2]
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)

    # --- histograms -------------------------------------------------------
    lum_hist = _norm_hist(cv2.calcHist([gray], [0], None, [32], [0, 256]).flatten())
    hue_hist = _norm_hist(cv2.calcHist([hsv], [0], None, [36], [0, 180]).flatten())
    sat_hist = _norm_hist(cv2.calcHist([s_ch], [0], None, [16], [0, 256]).flatten())

    # --- texture ----------------------------------------------------------
    edges = cv2.Canny(gray, 50, 150)
    edge_density = float((edges > 0).mean())
    sharpness = float(cv2.Laplacian(gray, cv2.CV_64F).var())

    # Gradient magnitude: catches soft, smooth textures that Canny misses
    # (blurred plumes, gradients) — essential for a fair "busyness" measure.
    gx = cv2.Sobel(gray, cv2.CV_32F, 1, 0, ksize=3)
    gy = cv2.Sobel(gray, cv2.CV_32F, 0, 1, ksize=3)
    gradient_mean = float(np.sqrt(gx**2 + gy**2).mean())
    # Local-variance texture energy (5x5 window), scaled 0..1
    mean_sq = cv2.blur(gray.astype(np.float32) ** 2, (5, 5))
    sq_mean = cv2.blur(gray.astype(np.float32), (5, 5)) ** 2
    texture_energy = float(np.clip(np.sqrt(np.maximum(mean_sq - sq_mean, 0)).mean() / 32.0, 0, 1))

    # --- entropy (Shannon, luminance) --------------------------------------
    p = np.asarray(lum_hist, dtype=float)
    p = p[p > 0]
    entropy = float(-(p * np.log2(p)).sum()) if p.size else 0.0

    # --- colorfulness (Hasler & Suesstrunk) --------------------------------
    b = img_bgr[:, :, 0].astype(float)
    g = img_bgr[:, :, 1].astype(float)
    r = img_bgr[:, :, 2].astype(float)
    rg = r - g
    yb = 0.5 * (r + g) - b
    colorfulness = float(
        np.sqrt(rg.std() ** 2 + yb.std() ** 2)
        + 0.3 * np.sqrt(rg.mean() ** 2 + yb.mean() ** 2)
    )

    # --- spatial luminance grid (GRID x GRID, normalized 0..1) -------------
    small = cv2.resize(gray, (GRID, GRID), interpolation=cv2.INTER_AREA)
    spatial_grid = (small.astype(float) / 255.0).flatten().tolist()

    # --- brightness centroid (normalized 0..1) ------------------------------
    total = float(gray.sum()) + 1e-9
    ys, xs = np.mgrid[0:h, 0:w]
    centroid_x = float((xs * gray).sum() / total / max(w, 1))
    centroid_y = float((ys * gray).sum() / total / max(h, 1))

    # --- FFT radial profile (8 bands, normalized) ---------------------------
    f = np.fft.fftshift(np.fft.fft2(gray.astype(float) - gray.mean()))
    mag = np.log1p(np.abs(f))
    cy0, cx0 = h // 2, w // 2
    yy, xx = np.mgrid[0:h, 0:w]
    rad = np.sqrt((xx - cx0) ** 2 + (yy - cy0) ** 2).astype(int)
    max_r = max(cy0, cx0, 1)
    radial = np.zeros(8)
    for i in range(8):
        mask = (rad >= i * max_r / 8) & (rad < (i + 1) * max_r / 8)
        radial[i] = mag[mask].mean() if mask.any() else 0.0
    radial = (radial / (radial.max() + 1e-9)).astype(float).tolist()

    # --- dominant colors (k-means, k=4) -------------------------------------
    data = img_bgr.reshape(-1, 3).astype(np.float32)
    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 20, 1.0)
    _, labels, centers = cv2.kmeans(data, 4, None, criteria, 3, cv2.KMEANS_PP_CENTERS)
    counts = np.bincount(labels.flatten(), minlength=4)
    order = np.argsort(-counts)
    dominant_colors = []
    for i in order:
        bb, gg, rr = centers[i]
        dominant_colors.append(
            {
                "bgr": [float(bb), float(gg), float(rr)],
                "share": float(counts[i] / len(data)),
            }
        )

    # --- hue peaks (top-3 histogram bins) -----------------------------------
    hue_arr = np.asarray(hue_hist)
    hue_peaks = np.argsort(-hue_arr)[:3].astype(int).tolist()

    return {
        "mean_hsv": [
            float(h_ch.mean()),
            float(s_ch.mean()),
            float(v_ch.mean()),
        ],
        "std_hsv": [
            float(h_ch.std()),
            float(s_ch.std()),
            float(v_ch.std()),
        ],
        "luminance_histogram": lum_hist,
        "hue_histogram": hue_hist,
        "saturation_histogram": sat_hist,
        "edge_density": edge_density,
        "sharpness": sharpness,
        "gradient_mean": gradient_mean,
        "texture_energy": texture_energy,
        "entropy": entropy,
        "colorfulness": colorfulness,
        "spatial_grid": spatial_grid,
        "grid_size": GRID,
        "centroid": [centroid_x, centroid_y],
        "fft_radial": radial,
        "dominant_colors": dominant_colors,
        "hue_peaks": hue_peaks,
        "width": int(w),
        "height": int(h),
    }
