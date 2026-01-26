"use client";

import { useEffect, useRef } from "react";
import { Box, useMantineTheme } from "@mantine/core";

interface WaveformProps {
  analyserNode: AnalyserNode | null;
  isRecording: boolean;
  barCount?: number;
  width?: number;
  height?: number;
}

export function Waveform({
  analyserNode,
  isRecording,
  barCount = 12,
  width = 200,
  height = 32,
}: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const theme = useMantineTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const primaryColor = theme.colors.blue[6];
    const barWidth = (width - (barCount - 1) * 2) / barCount;
    const barRadius = 2;

    const drawBars = (heights: number[]) => {
      ctx.clearRect(0, 0, width, height);

      heights.forEach((barHeight, i) => {
        const x = i * (barWidth + 2);
        const y = (height - barHeight) / 2;

        ctx.fillStyle = primaryColor;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, barRadius);
        ctx.fill();
      });
    };

    // If no analyser or not recording, show idle state
    if (!analyserNode || !isRecording) {
      const idleHeights = Array(barCount).fill(4);
      drawBars(idleHeights);
      return;
    }

    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      analyserNode.getByteFrequencyData(dataArray);

      // Sample frequency data into barCount buckets
      const bucketSize = Math.floor(bufferLength / barCount);
      const heights = [];

      for (let i = 0; i < barCount; i++) {
        let sum = 0;
        const start = i * bucketSize;
        for (let j = start; j < start + bucketSize; j++) {
          sum += dataArray[j];
        }
        const average = sum / bucketSize;
        // Map 0-255 to minHeight-height with some minimum
        const minHeight = 4;
        const barHeight = Math.max(minHeight, (average / 255) * height);
        heights.push(barHeight);
      }

      drawBars(heights);
      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [analyserNode, isRecording, barCount, width, height, theme.colors.blue]);

  return (
    <Box
      style={{
        width,
        height,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ display: "block" }}
      />
    </Box>
  );
}
