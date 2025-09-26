# Annotated thermal examples + a simple rule-based detector
#
# What this notebook does:
# 1) Loads the provided transformer thermal images from /mnt/data.
# 2) Detects "hotspots" using HSV thresholds (yellow/orange/red) + adaptive contrast checks.
# 3) Classifies each hotspot into your categories:
#    - Loose Joint (Faulty): red/orange + strong local contrast
#    - Loose Joint (Potential): yellow + strong local contrast
#    - Point Overload (Faulty): small, red/orange spot on thin structure
#    - Point Overload (Potential): small, yellow spot on thin structure
#    - Full Wire Overload (Potential): long thin hotspot region (large elongation)
# 4) Draws bounding boxes and labels, and writes a per-image CSV with detections.
# 
# Notes:
# - These are heuristic rules meant to get you started without training a model.
# - For production, see the model suggestions printed at the end of this cell.

import cv2
import numpy as np
import pandas as pd
from PIL import Image, ImageDraw, ImageFont
import os, math, io, base64
from matplotlib import pyplot as plt
from datetime import datetime

# -----------------------------
# Utilities
# -----------------------------

def ensure_dir(path):
    os.makedirs(path, exist_ok=True)

def pil_draw_box_with_label(pil_img, box, label, color=(255,0,0), width=3):
    draw = ImageDraw.Draw(pil_img)
    x1, y1, x2, y2 = box
    draw.rectangle([x1, y1, x2, y2], outline=color, width=width)
    # Draw label background
    text = label
    try:
        font = ImageFont.truetype("DejaVuSans.ttf", 18)
    except:
        font = ImageFont.load_default()
    tw, th = draw.textbbox((0,0), text, font=font)[2:]
    pad = 4
    bx1, by1 = x1, max(0, y1 - th - 2*pad)
    bx2, by2 = x1 + tw + 2*pad, by1 + th + 2*pad
    draw.rectangle([bx1, by1, bx2, by2], fill=(0,0,0))
    draw.text((bx1+pad, by1+pad), text, fill=(255,255,255), font=font)
    return pil_img

def compute_local_contrast(gray, mask):
    # Mean intensity in mask vs a dilated ring around it
    kern = np.ones((21,21), np.uint8)
    dil = cv2.dilate(mask, kern, iterations=1)
    ring = cv2.subtract(dil, mask)
    m_in = float(gray[mask>0].mean()) if np.any(mask>0) else 0.0
    m_out = float(gray[ring>0].mean()) if np.any(ring>0) else m_in+1e-6
    contrast = (m_in - m_out) / (m_out + 1e-6)
    return contrast, m_in, m_out

def shape_features(cnt):
    x,y,w,h = cv2.boundingRect(cnt)
    area = cv2.contourArea(cnt)
    perim = cv2.arcLength(cnt, True)
    aspect = w / (h+1e-6) if h>0 else 999.0
    # Fit ellipse if possible for elongation
    elong = 1.0
    if len(cnt) >= 5:
        ellipse = cv2.fitEllipse(cnt)
        (cx, cy), (MA, ma), angle = ellipse
        long_axis = max(MA, ma)
        short_axis = max(1e-6, min(MA, ma))
        elong = long_axis / short_axis
    return (x,y,w,h,area,perim,aspect,elong)

def dominant_hue(hsv, mask):
    h = hsv[...,0][mask>0]
    if h.size == 0:
        return None, 0.0
    # Convert hue 0-179 to degrees for interpretability if needed
    hist = cv2.calcHist([h.astype(np.uint8)], [0], None, [180], [0,180])
    idx = int(np.argmax(hist))
    frac = float(hist[idx] / (h.size+1e-6))
    return idx, frac

def classify_hotspot(hsv, gray, cnt, mask):
    # Extract features
    x,y,w,h,area,perim,aspect,elong = shape_features(cnt)
    contrast, m_in, m_out = compute_local_contrast(gray, mask)
    hue, hue_frac = dominant_hue(hsv, mask)
    # Size proxies
    img_area = gray.shape[0] * gray.shape[1]
    area_ratio = area / img_area
    # Heuristics
    is_small = area_ratio < 0.01
    is_large = area_ratio >= 0.05
    strong_contrast = contrast > 0.25   # adjustable
    moderate_contrast = contrast > 0.12
    
    # Color grouping (rough):
    # yellow ≈ hue 20–35; orange/red ≈ hue 0–20 and 170–180 wrap
    is_red_orange = (hue is not None) and (hue <= 20 or hue >= 170)
    is_yellowish = (hue is not None) and (20 < hue <= 35)

    # Full-wire shape proxy: elongated and not too tall
    looks_like_wire = elong > 3.0 and (min(w,h) < 0.25*max(gray.shape))
    # Decision tree
    label = "Hotspot"
    if strong_contrast and is_red_orange:
        if is_small:
            label = "Point Overload (Faulty)"
        else:
            label = "Loose Joint (Faulty)"
    elif (strong_contrast or moderate_contrast) and is_yellowish:
        if is_small:
            label = "Point Overload (Potential)"
        else:
            label = "Loose Joint (Potential)"
    elif looks_like_wire and (is_red_orange or is_yellowish):
        label = "Full Wire Overload (Potential)"
    else:
        # fallback: if high contrast but unknown hue bucket
        if strong_contrast:
            label = "Hotspot (Review)"
        else:
            label = "Warm Area (Likely Normal)"
    return label, {
        "x": int(x), "y": int(y), "w": int(w), "h": int(h),
        "area_ratio": float(area_ratio),
        "contrast": float(contrast),
        "hue": int(hue) if hue is not None else -1,
        "elongation": float(elong)
    }

def detect_and_annotate(img_bgr):
    # Convert to HSV
    hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)

    # Hot color mask (yellow/orange/red) with decent brightness
    # NOTE: thermal palettes vary; these ranges are a starting point.
    masks = []
    # Red range (low hue)
    m1 = cv2.inRange(hsv, (0, 120, 180), (15, 255, 255))
    # Red range (wrap high hue)
    m2 = cv2.inRange(hsv, (170, 120, 150), (179, 255, 255))
    # Yellow range
    m3 = cv2.inRange(hsv, (18, 80, 160), (35, 255, 255))

    hot_mask = cv2.bitwise_or(cv2.bitwise_or(m1, m2), m3)
    # Clean up
    hot_mask = cv2.morphologyEx(hot_mask, cv2.MORPH_OPEN, np.ones((5,5), np.uint8))
    hot_mask = cv2.morphologyEx(hot_mask, cv2.MORPH_CLOSE, np.ones((7,7), np.uint8))

    # Find contours
    contours, _ = cv2.findContours(hot_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    detections = []
    vis = Image.fromarray(cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB))
    for cnt in contours:
        if cv2.contourArea(cnt) < 80:  # ignore tiny specks
            continue
        mask = np.zeros(hot_mask.shape, dtype=np.uint8)
        cv2.drawContours(mask, [cnt], -1, 255, thickness=-1)
        label, meta = classify_hotspot(hsv, gray, cnt, mask)
        x,y,w,h = meta["x"], meta["y"], meta["w"], meta["h"]
        # Choose color by label
        col = (255,0,0)  # red fault default
        if "Potential" in label:
            col = (255,165,0)  # orange
        if "Likely Normal" in label or "Review" in label:
            col = (0,128,255)  # blue-ish for review/normal
        vis = pil_draw_box_with_label(vis, (x,y,x+w,y+h), label, color=col, width=3)
        meta["label"] = label
        detections.append(meta)

    return vis, detections

# -----------------------------
# Run on the provided images
# -----------------------------
# img_paths = [
#     "/mnt/data/T1_faulty_001.jpg",
#     "/mnt/data/T1_normal_002.jpg",
#     "/mnt/data/T1_normal_001.jpg",
#     "/mnt/data/T6_faulty_001.jpg",
#     "/mnt/data/T6_normal_003.jpg",
#     "/mnt/data/T1_faulty_002.jpg",
# ]
dataset_dir = "D:/ACCA Sem 7/Software Design Competetion/quanta-project/Fork/software-design-competetion-forked/ai-anomaly-service/dataset/Sample_Thermal_Images"
faulty_images = []
normal_images = []

for transformer in os.listdir(dataset_dir):
    for folders in os.listdir(os.path.join(dataset_dir, transformer)):
        if folders == "faulty":
            for images in os.listdir(os.path.join(dataset_dir, transformer, folders)):
                faulty_images.append(os.path.join(dataset_dir, transformer, folders, images))
        elif folders == "normal":
            for images in os.listdir(os.path.join(dataset_dir, transformer, folders)):
                normal_images.append(os.path.join(dataset_dir, transformer, folders, images))
                
print(f"Found {len(faulty_images)} faulty and {len(normal_images)} normal images.")

out_dir = "D:/ACCA Sem 7/Software Design Competetion/quanta-project/Fork/software-design-competetion-forked/ai-anomaly-service/dataset/outputs"
ensure_dir(out_dir)

img_paths = faulty_images + normal_images

all_rows = []
for p in img_paths:
    if not os.path.exists(p):
        continue
    bgr = cv2.imread(p)
    vis, dets = detect_and_annotate(bgr)
    base = os.path.splitext(os.path.basename(p))[0]
    out_path = os.path.join(out_dir, f"{base}_annotated.jpg")
    vis.save(out_path, quality=95)
    for d in dets:
        row = {"image": os.path.basename(p), **d}
        all_rows.append(row)

# Save detections CSV
df = pd.DataFrame(all_rows)
csv_path = os.path.join(out_dir, "detections.csv")
df.to_csv(csv_path, index=False)

# # Show previews
# figs = []
# for p in img_paths:
#     base = os.path.splitext(os.path.basename(p))[0]
#     out_path = os.path.join(out_dir, f"{base}_annotated.jpg")
#     if os.path.exists(out_path):
#         img = np.array(Image.open(out_path))
#         plt.figure(figsize=(6,6))
#         plt.imshow(img)
#         plt.axis("off")
#         plt.title(base)
#         plt.show()

# import caas_jupyter_tools as cj
# try:
#     if not df.empty:
#         cj.display_dataframe_to_user("Thermal Fault Detections", df)
# except Exception as e:
#     pass

print("Saved annotated images to:", out_dir)
print("Detections table:", csv_path)

print("\nMODEL SUGGESTIONS:\n"
      "- If you can label ~200–500 images with boxes, train YOLOv8n/v10n (classes: "
      "[loose_joint_faulty, loose_joint_potential, point_overload_faulty, "
      "point_overload_potential, full_wire_overload]). Keep 'normal' as image-level for validation metrics.\n"
      "- For very small hotspots, consider a two-stage approach: (1) hotspot proposal via this heuristic mask; "
      "(2) crop-and-classify with a lightweight classifier (e.g., MobileNetV3) to reduce false negatives.\n"
      "- If your camera exports radiometric temps, add temperature features (ΔT to local background, absolute T) into "
      "the label or as an extra channel to improve precision.")
