"use client";

import { Button, Modal, Textarea } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { addGroceriesFromReceipt } from "@/lib/actions/groceries";
import { parseReceiptText } from "@/lib/receipt-parser";

export function AddFromReceiptButton() {
  const router = useRouter();
  const [opened, { open, close }] = useDisclosure(false);
  const [extractedText, setExtractedText] = useState("");
  const [ocrLoading, setOcrLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  async function processFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }
    setError("");
    setOcrLoading(true);
    setExtractedText("");
    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng");
      const {
        data: { text },
      } = await worker.recognize(file);
      await worker.terminate();
      setExtractedText(text || "");
    } catch {
      setError("Could not read the receipt. Try another image or check the file.");
    } finally {
      setOcrLoading(false);
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) await processFile(file);
    e.target.value = "";
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) await processFile(file);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }

  async function handleAdd() {
    const text = extractedText.trim();
    if (!text) {
      setError("No text to parse. Upload a receipt image first.");
      return;
    }
    const items = parseReceiptText(text);
    if (items.length === 0) {
      setError("No items detected. Try editing the text above.");
      return;
    }
    setError("");
    setSubmitLoading(true);
    try {
      const result = await addGroceriesFromReceipt(items);
      if (result?.error) {
        setError(result.error);
        return;
      }
      const count = result?.added ?? 0;
      notifications.show({
        title: "Added to groceries",
        message: count === 1 ? "1 item added." : `${count} items added.`,
        color: "green",
      });
      close();
      setExtractedText("");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitLoading(false);
    }
  }

  function handleClose() {
    close();
    setExtractedText("");
    setError("");
  }

  return (
    <>
      <Button
        variant="filled"
        onClick={open}
        className="bg-primary hover:bg-primary-hover text-primary-foreground"
      >
        Add from receipt
      </Button>
      <Modal
        opened={opened}
        onClose={handleClose}
        title="Add groceries from receipt"
        size="md"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
            />
            <div
              role="button"
              tabIndex={0}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-surface-alt py-8 px-4 cursor-pointer hover:border-primary hover:bg-surface transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
              style={{ minHeight: "120px" }}
            >
              {ocrLoading ? (
                <p className="text-muted-foreground text-sm">Reading receipt…</p>
              ) : (
                <>
                  <p className="text-sm font-medium text-foreground">
                    Upload receipt image
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Drag and drop a file here, or click to browse
                  </p>
                </>
              )}
            </div>
            <div className="flex justify-center">
              <Button
                variant="subtle"
                size="sm"
                onClick={() => photoInputRef.current?.click()}
                disabled={ocrLoading}
              >
                Or take a photo
              </Button>
            </div>
          </div>
          <Textarea
            label="Extracted text (edit if needed)"
            placeholder="Upload an image to extract text, or paste receipt text here."
            value={extractedText}
            onChange={(e) => setExtractedText(e.currentTarget.value)}
            minRows={8}
          />
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="default" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              variant="filled"
              onClick={handleAdd}
              loading={submitLoading}
              disabled={!extractedText.trim()}
              className="bg-primary hover:bg-primary-hover"
            >
              Add to my groceries
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
