#!/usr/bin/env bash
set -euo pipefail

# concat-pdfs.sh — Recursively concatenate PDFs in a folder tree.
# Each directory containing PDFs produces one merged output file.
# All outputs are placed in an "output/" folder in the current working directory.

usage() {
  echo "Usage: $(basename "$0") <target-folder>"
  echo ""
  echo "Concatenates all PDFs in <target-folder> and its subfolders."
  echo "Each folder with PDFs produces one merged file in ./output/"
  exit 1
}

# --- Dependency check ---
if ! command -v gs &>/dev/null; then
  echo "Error: Ghostscript (gs) is not installed or not in PATH." >&2
  echo "Install it with: apt install ghostscript / brew install ghostscript" >&2
  exit 1
fi

# --- Argument validation ---
if [[ $# -lt 1 ]]; then
  usage
fi

TARGET_DIR="$1"

if [[ ! -d "$TARGET_DIR" ]]; then
  echo "Error: '$TARGET_DIR' is not a directory." >&2
  exit 1
fi

# Resolve to absolute path for consistent relative-path computation
TARGET_DIR="$(cd "$TARGET_DIR" && pwd)"
TARGET_BASENAME="$(basename "$TARGET_DIR")"

# --- Output directory ---
OUTPUT_DIR="$(pwd)/output"
mkdir -p "$OUTPUT_DIR"

# --- Find and process directories containing PDFs ---
count=0

while IFS= read -r -d '' dir; do
  # Collect PDFs in this directory only (not recursive), sorted alphabetically
  mapfile -t pdfs < <(find "$dir" -maxdepth 1 -iname '*.pdf' -type f | sort)

  if [[ ${#pdfs[@]} -eq 0 ]]; then
    continue
  fi

  # Derive output filename from relative path
  rel_path="${dir#"$TARGET_DIR"}"
  rel_path="${rel_path#/}"  # strip leading slash

  if [[ -z "$rel_path" ]]; then
    # Root folder — use its own name
    output_name="${TARGET_BASENAME}.pdf"
  else
    # Replace path separators with underscores
    output_name="${rel_path//\//_}.pdf"
  fi

  output_file="$OUTPUT_DIR/$output_name"

  echo "Merging ${#pdfs[@]} PDF(s) from '${dir}' → ${output_name}"

  gs -dBATCH -dNOPAUSE -q -sDEVICE=pdfwrite -sOutputFile="$output_file" "${pdfs[@]}"

  ((count++))
done < <(find "$TARGET_DIR" -type d -print0 | sort -z)

# --- Summary ---
if [[ $count -eq 0 ]]; then
  echo "No PDFs found in '$TARGET_DIR'."
  exit 1
fi

echo ""
echo "Done! Created $count merged PDF(s) in: $OUTPUT_DIR"
