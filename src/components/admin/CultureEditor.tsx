"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  Box,
  TextInput,
  Textarea,
  Button,
  Stack,
  Group,
  Text,
  Skeleton,
  Divider,
  Badge,
  Paper,
  Modal,
  FileButton,
  ActionIcon,
  Tooltip,
  Slider,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconCheck,
  IconTrash,
  IconDeviceFloppy,
  IconUpload,
  IconX,
  IconMap,
  IconPlus,
  IconEraser,
  IconArrowBackUp,
  IconHandMove,
} from "@tabler/icons-react";
import { getMediaUrl } from "@/lib/media-url";
import Image from "next/image";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import circle from "@turf/circle";
import union from "@turf/union";
import difference from "@turf/difference";
import buffer from "@turf/buffer";
import { featureCollection, lineString } from "@turf/helpers";
import type { MapMouseEvent, GeoJSONSource } from "maplibre-gl";

interface Phrase {
  id: string;
  text: string;
  translation: string;
  audioUrl: string | null;
}

interface Language {
  id: string;
  name: string;
  phrases: Phrase[];
}

interface Content {
  id: string;
  title: string;
  contentType: "UPLOAD" | "VIDEO_YOUTUBE";
  contentUrl: string | null;
}

interface CultureDetails {
  id: string;
  name: string;
  slug: string;
  state: "pending" | "approved";
  description: string | null;
  flagUrl: string | null;
  languages: Language[];
  contents: Content[];
  submittedBy: { id: string; email: string } | null;
  boundaryGeoJson: string | null;
}

// Convert slider value (0-100) to radius in kilometers
function sliderToRadius(value: number): number {
  const minRadius = 1;
  const maxRadius = 200;
  const t = value / 100;
  return minRadius + (maxRadius - minRadius) * (t * t);
}

interface EditableLanguage {
  id: string;
  name: string;
  phrases: {
    id: string;
    text: string;
    translation: string;
    audioUrl?: string;
  }[];
}

interface EditableContent {
  id: string;
  title: string;
  contentType: "UPLOAD" | "VIDEO_YOUTUBE";
  contentUrl: string | null;
}

interface CultureEditorProps {
  slug: string;
  onUpdated: () => void;
  onDeleted: () => void;
}

export function CultureEditor({
  slug,
  onUpdated,
  onDeleted,
}: CultureEditorProps) {
  const [culture, setCulture] = useState<CultureDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploadingFlag, setUploadingFlag] = useState(false);
  const [uploadingContentIndex, setUploadingContentIndex] = useState<
    number | null
  >(null);
  const [uploadingAudioIndex, setUploadingAudioIndex] = useState<{
    langIndex: number;
    phraseIndex: number;
  } | null>(null);

  // Editable fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [flagUrl, setFlagUrl] = useState<string | null>(null);
  const [languages, setLanguages] = useState<EditableLanguage[]>([]);
  const [contents, setContents] = useState<EditableContent[]>([]);
  const [boundaryGeoJson, setBoundaryGeoJson] = useState<string | null>(null);

  // Delete confirmation modal
  const [
    deleteModalOpened,
    { open: openDeleteModal, close: closeDeleteModal },
  ] = useDisclosure(false);

  // Boundary edit modal
  const [
    boundaryModalOpened,
    { open: openBoundaryModal, close: closeBoundaryModal },
  ] = useDisclosure(false);

  const resetRef = useRef<() => void>(null);
  const previewMapContainerRef = useRef<HTMLDivElement>(null);
  const previewMapRef = useRef<maplibregl.Map | null>(null);

  // Boundary editor state
  const editMapContainerRef = useRef<HTMLDivElement>(null);
  const editMapRef = useRef<maplibregl.Map | null>(null);
  const [brushMode, setBrushMode] = useState<"add" | "erase">("add");
  const [brushSize, setBrushSize] = useState(30);
  const [showMode, setShowMode] = useState(true);
  const [editPolygon, setEditPolygon] = useState<GeoJSON.Feature<
    GeoJSON.Polygon | GeoJSON.MultiPolygon
  > | null>(null);
  const [polygonHistory, setPolygonHistory] = useState<
    (GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon> | null)[]
  >([]);
  const editPolygonRef = useRef(editPolygon);
  const isMouseDownRef = useRef(false);
  const strokePointsRef = useRef<[number, number][]>([]);
  const cursorPosRef = useRef<{ lng: number; lat: number } | null>(null);

  // Fetch culture details
  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/cultures/${slug}`)
      .then((res) => res.json())
      .then((data) => {
        setCulture(data);
        setName(data.name || "");
        setDescription(data.description || "");
        setFlagUrl(data.flagUrl);
        setBoundaryGeoJson(data.boundaryGeoJson || null);
        setLanguages(
          data.languages.map((lang: Language) => ({
            id: lang.id,
            name: lang.name,
            phrases: lang.phrases.map((p) => ({
              id: p.id,
              text: p.text,
              translation: p.translation,
              audioUrl: p.audioUrl || undefined,
            })),
          })),
        );
        setContents(
          data.contents.map((c: Content) => ({
            id: c.id,
            title: c.title,
            contentType: c.contentType,
            contentUrl: c.contentUrl,
          })),
        );
      })
      .catch((err) => {
        console.error("Failed to fetch culture:", err);
        notifications.show({
          message: "Failed to load culture details",
          color: "red",
        });
      })
      .finally(() => setLoading(false));
  }, [slug]);

  // Keep editPolygonRef in sync
  useEffect(() => {
    editPolygonRef.current = editPolygon;
  }, [editPolygon]);

  // Preview map for boundary display
  useEffect(() => {
    if (!previewMapContainerRef.current || !boundaryGeoJson) return;

    const geometry = JSON.parse(boundaryGeoJson);
    const feature: GeoJSON.Feature<GeoJSON.MultiPolygon> = {
      type: "Feature",
      properties: {},
      geometry,
    };

    const map = new maplibregl.Map({
      container: previewMapContainerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "&copy; OpenStreetMap contributors",
          },
        },
        layers: [{ id: "osm", type: "raster", source: "osm" }],
      },
      center: [0, 20],
      zoom: 3,
      interactive: false,
    });

    previewMapRef.current = map;

    map.on("load", () => {
      map.addSource("boundary", { type: "geojson", data: feature });
      map.addLayer({
        id: "boundary-fill",
        type: "fill",
        source: "boundary",
        paint: { "fill-color": "#3b82f6", "fill-opacity": 0.3 },
      });
      map.addLayer({
        id: "boundary-stroke",
        type: "line",
        source: "boundary",
        paint: { "line-color": "#2563eb", "line-width": 2 },
      });

      // Fit map to boundary
      const coords = geometry.coordinates.flat(2);
      const lngs = coords.map((c: number[]) => c[0]);
      const lats = coords.map((c: number[]) => c[1]);
      const bounds = new maplibregl.LngLatBounds(
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      );
      map.fitBounds(bounds, { padding: 40 });
    });

    return () => {
      map.remove();
      previewMapRef.current = null;
    };
  }, [boundaryGeoJson]);

  // Boundary editor map
  const radiusKm = sliderToRadius(brushSize);

  const initBoundaryEditor = useCallback(() => {
    if (!editMapContainerRef.current) return;

    // Initialize polygon from current boundary
    if (boundaryGeoJson) {
      const geometry = JSON.parse(boundaryGeoJson);
      const feature: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon> = {
        type: "Feature",
        properties: {},
        geometry,
      };
      setEditPolygon(feature);
      editPolygonRef.current = feature;
    } else {
      setEditPolygon(null);
      editPolygonRef.current = null;
    }
    setPolygonHistory([]);

    const map = new maplibregl.Map({
      container: editMapContainerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "&copy; OpenStreetMap contributors",
          },
        },
        layers: [{ id: "osm", type: "raster", source: "osm" }],
      },
      center: [0, 20],
      zoom: 3,
    });

    editMapRef.current = map;

    map.on("load", () => {
      // Add polygon source
      map.addSource("edit-polygon", {
        type: "geojson",
        data: boundaryGeoJson
          ? {
              type: "Feature",
              properties: {},
              geometry: JSON.parse(boundaryGeoJson),
            }
          : featureCollection([]),
      });
      map.addLayer({
        id: "edit-polygon-fill",
        type: "fill",
        source: "edit-polygon",
        paint: { "fill-color": "#3b82f6", "fill-opacity": 0.2 },
      });
      map.addLayer({
        id: "edit-polygon-line",
        type: "line",
        source: "edit-polygon",
        paint: { "line-color": "#3b82f6", "line-width": 3 },
      });

      // Add stroke preview source
      map.addSource("edit-stroke", {
        type: "geojson",
        data: featureCollection([]),
      });
      map.addLayer({
        id: "edit-stroke-fill",
        type: "fill",
        source: "edit-stroke",
        paint: { "fill-color": "#3b82f6", "fill-opacity": 0.4 },
      });
      map.addLayer({
        id: "edit-stroke-line",
        type: "line",
        source: "edit-stroke",
        paint: { "line-color": "#3b82f6", "line-width": 2 },
      });

      // Add cursor source
      map.addSource("edit-cursor", {
        type: "geojson",
        data: featureCollection([]),
      });
      map.addLayer({
        id: "edit-cursor-line",
        type: "line",
        source: "edit-cursor",
        paint: {
          "line-color": "#3b82f6",
          "line-width": 2,
          "line-dasharray": [3, 3],
        },
      });

      // Fit to boundary if exists
      if (boundaryGeoJson) {
        const geometry = JSON.parse(boundaryGeoJson);
        const coords = geometry.coordinates.flat(2);
        const lngs = coords.map((c: number[]) => c[0]);
        const lats = coords.map((c: number[]) => c[1]);
        const bounds = new maplibregl.LngLatBounds(
          [Math.min(...lngs), Math.min(...lats)],
          [Math.max(...lngs), Math.max(...lats)],
        );
        map.fitBounds(bounds, { padding: 40 });
      }
    });
  }, [boundaryGeoJson]);

  const cleanupBoundaryEditor = useCallback(() => {
    if (editMapRef.current) {
      editMapRef.current.remove();
      editMapRef.current = null;
    }
    setEditPolygon(null);
    setPolygonHistory([]);
    setBrushMode("add");
    setShowMode(true);
  }, []);

  // Handle boundary modal open/close
  useEffect(() => {
    if (boundaryModalOpened) {
      // Small delay to ensure DOM is ready
      setTimeout(initBoundaryEditor, 100);
    } else {
      cleanupBoundaryEditor();
    }
  }, [boundaryModalOpened, initBoundaryEditor, cleanupBoundaryEditor]);

  // Update polygon visualization in editor
  useEffect(() => {
    if (!editMapRef.current || !boundaryModalOpened) return;
    const source = editMapRef.current.getSource("edit-polygon") as
      | GeoJSONSource
      | undefined;
    if (source) {
      if (editPolygon) {
        source.setData(editPolygon);
      } else {
        source.setData(featureCollection([]));
      }
    }
  }, [editPolygon, boundaryModalOpened]);

  // Update cursor preview
  const updateCursorPreview = useCallback(() => {
    if (!editMapRef.current) return;
    const source = editMapRef.current.getSource("edit-cursor") as
      | GeoJSONSource
      | undefined;
    if (!source) return;
    if (showMode || !cursorPosRef.current) {
      source.setData(featureCollection([]));
      return;
    }
    const cursorCircle = circle(
      [cursorPosRef.current.lng, cursorPosRef.current.lat],
      radiusKm,
      { units: "kilometers" },
    );
    source.setData(cursorCircle);
  }, [radiusKm, showMode]);

  // Update stroke preview
  const updateStrokePreview = useCallback(() => {
    if (!editMapRef.current) return;
    const source = editMapRef.current.getSource("edit-stroke") as
      | GeoJSONSource
      | undefined;
    if (!source) return;
    const points = strokePointsRef.current;
    if (points.length < 2) {
      if (points.length === 1) {
        const singleCircle = circle(points[0], radiusKm, {
          units: "kilometers",
        });
        source.setData(singleCircle);
      } else {
        source.setData(featureCollection([]));
      }
      return;
    }
    const line = lineString(points);
    const bufferedLine = buffer(line, radiusKm, { units: "kilometers" });
    if (bufferedLine) {
      source.setData(bufferedLine);
    }
  }, [radiusKm]);

  const clearStrokePreview = useCallback(() => {
    strokePointsRef.current = [];
    if (editMapRef.current) {
      const source = editMapRef.current.getSource("edit-stroke") as
        | GeoJSONSource
        | undefined;
      if (source) {
        source.setData(featureCollection([]));
      }
    }
  }, []);

  // Commit stroke
  const commitStroke = useCallback(() => {
    const points = strokePointsRef.current;
    if (points.length === 0) {
      clearStrokePreview();
      return;
    }

    let strokeShape: GeoJSON.Feature<
      GeoJSON.Polygon | GeoJSON.MultiPolygon
    > | null;
    if (points.length === 1) {
      strokeShape = circle(points[0], radiusKm, {
        units: "kilometers",
      }) as GeoJSON.Feature<GeoJSON.Polygon>;
    } else {
      const line = lineString(points);
      strokeShape = buffer(line, radiusKm, {
        units: "kilometers",
      }) as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon> | null;
    }

    if (!strokeShape) {
      clearStrokePreview();
      return;
    }

    const current = editPolygonRef.current;
    let newPolygon: GeoJSON.Feature<
      GeoJSON.Polygon | GeoJSON.MultiPolygon
    > | null;

    if (brushMode === "add") {
      if (!current) {
        newPolygon = strokeShape;
      } else {
        const merged = union(featureCollection([current, strokeShape]));
        newPolygon = merged as GeoJSON.Feature<
          GeoJSON.Polygon | GeoJSON.MultiPolygon
        > | null;
      }
    } else {
      if (!current) {
        clearStrokePreview();
        return;
      }
      const subtracted = difference(featureCollection([current, strokeShape]));
      newPolygon = subtracted as GeoJSON.Feature<
        GeoJSON.Polygon | GeoJSON.MultiPolygon
      > | null;
    }

    clearStrokePreview();

    if (newPolygon) {
      editPolygonRef.current = newPolygon;
      setPolygonHistory((prev) => [...prev, current]);
      setEditPolygon(newPolygon);
    } else {
      editPolygonRef.current = null;
      setPolygonHistory((prev) => [...prev, current]);
      setEditPolygon(null);
    }
  }, [brushMode, radiusKm, clearStrokePreview]);

  // Undo
  const handleBoundaryUndo = useCallback(() => {
    if (polygonHistory.length === 0) return;
    const prev = polygonHistory[polygonHistory.length - 1];
    setPolygonHistory((h) => h.slice(0, -1));
    setEditPolygon(prev);
    editPolygonRef.current = prev;
  }, [polygonHistory]);

  // Map event handlers for boundary editor
  useEffect(() => {
    if (!editMapRef.current || !boundaryModalOpened) return;

    const map = editMapRef.current;
    const canvas = map.getCanvas();
    canvas.style.cursor = showMode ? "grab" : "crosshair";

    const onMouseDown = (e: MapMouseEvent) => {
      if (showMode) return;
      isMouseDownRef.current = true;
      strokePointsRef.current = [[e.lngLat.lng, e.lngLat.lat]];
      updateStrokePreview();
      map.dragPan.disable();
    };

    const onMouseUp = () => {
      if (showMode) return;
      if (isMouseDownRef.current) {
        commitStroke();
      }
      isMouseDownRef.current = false;
      map.dragPan.enable();
    };

    const onMouseMove = (e: MapMouseEvent) => {
      cursorPosRef.current = { lng: e.lngLat.lng, lat: e.lngLat.lat };
      if (!showMode) {
        updateCursorPreview();
        if (isMouseDownRef.current) {
          const points = strokePointsRef.current;
          const lastPoint = points[points.length - 1];
          if (lastPoint) {
            const dx = e.lngLat.lng - lastPoint[0];
            const dy = e.lngLat.lat - lastPoint[1];
            const minDistance = radiusKm * 0.002;
            if (Math.sqrt(dx * dx + dy * dy) > minDistance) {
              strokePointsRef.current.push([e.lngLat.lng, e.lngLat.lat]);
              updateStrokePreview();
            }
          }
        }
      }
    };

    const onDocumentMouseUp = () => {
      if (isMouseDownRef.current) {
        commitStroke();
        isMouseDownRef.current = false;
        map.dragPan.enable();
      }
    };

    map.on("mousedown", onMouseDown);
    map.on("mouseup", onMouseUp);
    map.on("mousemove", onMouseMove);
    document.addEventListener("mouseup", onDocumentMouseUp);

    return () => {
      map.off("mousedown", onMouseDown);
      map.off("mouseup", onMouseUp);
      map.off("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onDocumentMouseUp);
      canvas.style.cursor = "";
    };
  }, [
    boundaryModalOpened,
    showMode,
    radiusKm,
    commitStroke,
    updateCursorPreview,
    updateStrokePreview,
  ]);

  // Update cursor/stroke colors based on brush mode
  useEffect(() => {
    if (!editMapRef.current || !boundaryModalOpened) return;
    const map = editMapRef.current;
    const color = brushMode === "add" ? "#3b82f6" : "#ef4444";
    if (map.getLayer("edit-cursor-line")) {
      map.setPaintProperty("edit-cursor-line", "line-color", color);
    }
    if (map.getLayer("edit-stroke-fill")) {
      map.setPaintProperty("edit-stroke-fill", "fill-color", color);
    }
    if (map.getLayer("edit-stroke-line")) {
      map.setPaintProperty("edit-stroke-line", "line-color", color);
    }
  }, [brushMode, boundaryModalOpened]);

  // Update cursor when brush size changes
  useEffect(() => {
    if (boundaryModalOpened) {
      updateCursorPreview();
    }
  }, [radiusKm, showMode, boundaryModalOpened, updateCursorPreview]);

  const saveBoundaryEdit = () => {
    if (editPolygon) {
      // Convert to MultiPolygon if needed
      let geometry = editPolygon.geometry;
      if (geometry.type === "Polygon") {
        geometry = {
          type: "MultiPolygon",
          coordinates: [geometry.coordinates],
        };
      }
      setBoundaryGeoJson(JSON.stringify(geometry));
    } else {
      setBoundaryGeoJson(null);
    }
    closeBoundaryModal();
  };

  const handleFlagUpload = async (file: File | null) => {
    if (!file || !culture) return;

    setUploadingFlag(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", "flags");
      formData.append("cultureSlug", culture.slug);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      const data = await res.json();
      setFlagUrl(data.url);

      notifications.show({
        message: "Flag uploaded",
        color: "green",
        icon: <IconCheck size={16} />,
      });
    } catch (err) {
      console.error("Flag upload error:", err);
      notifications.show({
        message: "Failed to upload flag",
        color: "red",
      });
    } finally {
      setUploadingFlag(false);
      resetRef.current?.();
    }
  };

  const handleContentUpload = async (
    file: File | null,
    contentIndex: number,
  ) => {
    if (!file || !culture) return;

    setUploadingContentIndex(contentIndex);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", "content");
      formData.append("cultureSlug", culture.slug);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      const data = await res.json();
      updateContentUrl(contentIndex, data.url);

      notifications.show({
        message: "Content uploaded",
        color: "green",
        icon: <IconCheck size={16} />,
      });
    } catch (err) {
      console.error("Content upload error:", err);
      notifications.show({
        message: "Failed to upload content",
        color: "red",
      });
    } finally {
      setUploadingContentIndex(null);
    }
  };

  const handlePhraseAudioUpload = async (
    file: File | null,
    langIndex: number,
    phraseIndex: number,
  ) => {
    if (!file || !culture) return;

    setUploadingAudioIndex({ langIndex, phraseIndex });
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", "audio");
      formData.append("cultureSlug", culture.slug);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      const data = await res.json();
      updatePhraseAudioUrl(langIndex, phraseIndex, data.url);

      notifications.show({
        message: "Audio uploaded",
        color: "green",
        icon: <IconCheck size={16} />,
      });
    } catch (err) {
      console.error("Audio upload error:", err);
      notifications.show({
        message: "Failed to upload audio",
        color: "red",
      });
    } finally {
      setUploadingAudioIndex(null);
    }
  };

  const updatePhraseAudioUrl = (
    langIndex: number,
    phraseIndex: number,
    audioUrl: string | undefined,
  ) => {
    setLanguages((prev) =>
      prev.map((lang, i) =>
        i === langIndex
          ? {
              ...lang,
              phrases: lang.phrases.map((p, pi) =>
                pi === phraseIndex ? { ...p, audioUrl } : p,
              ),
            }
          : lang,
      ),
    );
  };

  const updateLanguageName = (langIndex: number, newName: string) => {
    setLanguages((prev) =>
      prev.map((lang, i) =>
        i === langIndex ? { ...lang, name: newName } : lang,
      ),
    );
  };

  const updatePhraseText = (
    langIndex: number,
    phraseIndex: number,
    newText: string,
  ) => {
    setLanguages((prev) =>
      prev.map((lang, i) =>
        i === langIndex
          ? {
              ...lang,
              phrases: lang.phrases.map((p, pi) =>
                pi === phraseIndex ? { ...p, text: newText } : p,
              ),
            }
          : lang,
      ),
    );
  };

  const updatePhraseTranslation = (
    langIndex: number,
    phraseIndex: number,
    newTranslation: string,
  ) => {
    setLanguages((prev) =>
      prev.map((lang, i) =>
        i === langIndex
          ? {
              ...lang,
              phrases: lang.phrases.map((p, pi) =>
                pi === phraseIndex ? { ...p, translation: newTranslation } : p,
              ),
            }
          : lang,
      ),
    );
  };

  const updateContentTitle = (contentIndex: number, newTitle: string) => {
    setContents((prev) =>
      prev.map((c, i) => (i === contentIndex ? { ...c, title: newTitle } : c)),
    );
  };

  const removeLanguage = (langIndex: number) => {
    setLanguages((prev) => prev.filter((_, i) => i !== langIndex));
  };

  const removePhrase = (langIndex: number, phraseIndex: number) => {
    setLanguages((prev) =>
      prev.map((lang, i) =>
        i === langIndex
          ? {
              ...lang,
              phrases: lang.phrases.filter((_, pi) => pi !== phraseIndex),
            }
          : lang,
      ),
    );
  };

  const removeContent = (contentIndex: number) => {
    setContents((prev) => prev.filter((_, i) => i !== contentIndex));
  };

  const addLanguage = () => {
    setLanguages((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        name: "",
        phrases: [],
      },
    ]);
  };

  const addPhrase = (langIndex: number) => {
    setLanguages((prev) =>
      prev.map((lang, i) =>
        i === langIndex
          ? {
              ...lang,
              phrases: [
                ...lang.phrases,
                {
                  id: `new-${Date.now()}`,
                  text: "",
                  translation: "",
                },
              ],
            }
          : lang,
      ),
    );
  };

  const addContent = () => {
    setContents((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        title: "",
        contentType: "UPLOAD" as const,
        contentUrl: null,
      },
    ]);
  };

  const updateContentUrl = (contentIndex: number, newUrl: string) => {
    setContents((prev) =>
      prev.map((c, i) =>
        i === contentIndex ? { ...c, contentUrl: newUrl || null } : c,
      ),
    );
  };

  const updateContentType = (
    contentIndex: number,
    newType: "UPLOAD" | "VIDEO_YOUTUBE",
  ) => {
    setContents((prev) =>
      prev.map((c, i) =>
        i === contentIndex ? { ...c, contentType: newType } : c,
      ),
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Prepare boundaryGeoJson as a Feature for the API
      let boundaryPayload: string | null = null;
      if (boundaryGeoJson) {
        const geometry = JSON.parse(boundaryGeoJson);
        boundaryPayload = JSON.stringify({
          type: "Feature",
          properties: {},
          geometry,
        });
      }

      const res = await fetch(`/api/admin/cultures/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          flagUrl,
          boundaryGeoJson: boundaryPayload,
          languages: languages.map((lang) => ({
            name: lang.name,
            phrases: lang.phrases.map((p) => ({
              text: p.text,
              translation: p.translation,
              audioUrl: p.audioUrl,
            })),
          })),
          contents: contents.map((c) => ({
            title: c.title,
            contentType: c.contentType,
            contentUrl: c.contentUrl,
          })),
        }),
      });

      if (!res.ok) throw new Error("Failed to save");

      // Refetch to get updated data
      const updated = await fetch(`/api/admin/cultures/${slug}`).then((r) =>
        r.json(),
      );
      setCulture(updated);

      notifications.show({
        message: "Culture updated successfully",
        color: "green",
        icon: <IconCheck size={16} />,
      });
      onUpdated();
    } catch (err) {
      console.error("Save error:", err);
      notifications.show({
        message: "Failed to save changes",
        color: "red",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/cultures/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: "approved" }),
      });

      if (!res.ok) throw new Error("Failed to approve");

      notifications.show({
        message: "Culture approved successfully",
        color: "green",
        icon: <IconCheck size={16} />,
      });
      onUpdated();
    } catch (err) {
      console.error("Approve error:", err);
      notifications.show({
        message: "Failed to approve culture",
        color: "red",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/cultures/${slug}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete");

      notifications.show({
        message: "Culture deleted successfully",
        color: "green",
        icon: <IconCheck size={16} />,
      });
      closeDeleteModal();
      onDeleted();
    } catch (err) {
      console.error("Delete error:", err);
      notifications.show({
        message: "Failed to delete culture",
        color: "red",
      });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <Box p="lg">
        <Stack gap="md">
          <Skeleton height={40} />
          <Skeleton height={100} />
          <Skeleton height={200} />
        </Stack>
      </Box>
    );
  }

  if (!culture) {
    return (
      <Box p="lg">
        <Text c="red">Failed to load culture</Text>
      </Box>
    );
  }

  // Check if there are any changes
  const hasBasicChanges =
    name !== culture.name ||
    description !== (culture.description || "") ||
    flagUrl !== culture.flagUrl ||
    boundaryGeoJson !== (culture.boundaryGeoJson || null);

  const hasLanguageChanges =
    JSON.stringify(languages) !==
    JSON.stringify(
      culture.languages.map((lang) => ({
        id: lang.id,
        name: lang.name,
        phrases: lang.phrases.map((p) => ({
          id: p.id,
          text: p.text,
          translation: p.translation,
          audioUrl: p.audioUrl || undefined,
        })),
      })),
    );

  const hasContentChanges =
    JSON.stringify(contents) !==
    JSON.stringify(
      culture.contents.map((c) => ({
        id: c.id,
        title: c.title,
        contentType: c.contentType,
        contentUrl: c.contentUrl,
      })),
    );

  const hasChanges = hasBasicChanges || hasLanguageChanges || hasContentChanges;

  return (
    <Box p="lg">
      <Stack gap="lg">
        {/* Header with status */}
        <Group justify="space-between" align="center">
          <Group gap="sm">
            <Text size="xl" fw={600}>
              {culture.name}
            </Text>
            <Badge color={culture.state === "approved" ? "green" : "yellow"}>
              {culture.state}
            </Badge>
          </Group>
          {culture.submittedBy && (
            <Text size="sm" c="dimmed">
              Submitted by: {culture.submittedBy.email}
            </Text>
          )}
        </Group>

        <Divider />

        {/* Basic Info */}
        <Stack gap="md">
          <TextInput
            label="What's your culture called? "
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <TextInput label="Slug" value={culture.slug} disabled />

          <Textarea
            label="What makes your culture special?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            minRows={3}
            autosize
          />

          {/* Flag with upload */}
          <Box>
            <Text size="sm" fw={500} mb="xs">
              Flag
            </Text>
            <Group align="flex-end" gap="md">
              {flagUrl && (
                <div className="relative w-16 h-12">
                  <Image
                    src={getMediaUrl(flagUrl)}
                    alt={`${culture.name} flag`}
                    fill
                    className="object-contain rounded border"
                    unoptimized
                  />
                </div>
              )}
              <FileButton
                resetRef={resetRef}
                onChange={handleFlagUpload}
                accept="image/*"
              >
                {(props) => (
                  <Button
                    {...props}
                    variant="light"
                    size="xs"
                    leftSection={<IconUpload size={14} />}
                    loading={uploadingFlag}
                  >
                    {flagUrl ? "Change" : "Upload"}
                  </Button>
                )}
              </FileButton>
            </Group>
          </Box>
        </Stack>

        <Divider />

        {/* Boundary */}
        <Box>
          <Group gap="xs" mb="md">
            <IconMap size={16} />
            <Text fw={600}>Territory</Text>
            {boundaryGeoJson && (
              <Badge size="sm" variant="light" color="blue">
                {(() => {
                  try {
                    const geom = JSON.parse(boundaryGeoJson);
                    const count = geom.coordinates?.length ?? 0;
                    return `${count} ${count === 1 ? "polygon" : "polygons"}`;
                  } catch {
                    return "Invalid";
                  }
                })()}
              </Badge>
            )}
          </Group>
          {boundaryGeoJson ? (
            <Stack gap="sm">
              <Paper withBorder p={0} className="overflow-hidden">
                <div
                  ref={previewMapContainerRef}
                  style={{ height: 200, width: "100%" }}
                />
              </Paper>
              <Button
                variant="light"
                size="xs"
                leftSection={<IconMap size={14} />}
                onClick={openBoundaryModal}
              >
                Edit Boundary
              </Button>
            </Stack>
          ) : (
            <Stack gap="sm">
              <Text c="dimmed" size="sm">
                No boundary defined
              </Text>
              <Button
                variant="light"
                size="xs"
                leftSection={<IconPlus size={14} />}
                onClick={openBoundaryModal}
              >
                Add Boundary
              </Button>
            </Stack>
          )}
        </Box>

        <Divider />

        {/* Languages */}
        <Box>
          <Group gap="xs" mb="md" justify="space-between">
            <Group gap="xs">
              <Text fw={600}>Languages</Text>
              <Badge size="sm" variant="light">
                {languages.length}
              </Badge>
            </Group>
            <Button
              variant="light"
              size="xs"
              leftSection={<IconPlus size={14} />}
              onClick={addLanguage}
            >
              Add Language
            </Button>
          </Group>
          {languages.length === 0 ? (
            <Text c="dimmed" size="sm">
              No languages added
            </Text>
          ) : (
            <Stack gap="md">
              {languages.map((lang, langIndex) => (
                <Paper key={lang.id} p="sm" withBorder>
                  <Group gap="xs" mb="xs">
                    <TextInput
                      value={lang.name}
                      onChange={(e) =>
                        updateLanguageName(langIndex, e.target.value)
                      }
                      size="sm"
                      style={{ flex: 1 }}
                      styles={{ input: { fontWeight: 500 } }}
                      placeholder="Language name"
                    />
                    <Tooltip label="Remove language">
                      <ActionIcon
                        color="red"
                        variant="light"
                        onClick={() => removeLanguage(langIndex)}
                      >
                        <IconX size={16} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                  <Stack gap="xs">
                    {lang.phrases.map((phrase, phraseIndex) => (
                      <Paper key={phrase.id} p="sm" withBorder>
                        <Group align="flex-start" gap="xs">
                          <Stack gap="xs" style={{ flex: 1 }}>
                            <TextInput
                              label="Original"
                              value={phrase.text}
                              onChange={(e) =>
                                updatePhraseText(
                                  langIndex,
                                  phraseIndex,
                                  e.target.value,
                                )
                              }
                              size="sm"
                            />
                            <TextInput
                              label="Translation"
                              value={phrase.translation}
                              onChange={(e) =>
                                updatePhraseTranslation(
                                  langIndex,
                                  phraseIndex,
                                  e.target.value,
                                )
                              }
                              size="sm"
                            />
                            <Box>
                              <Text size="xs" fw={500} mb={4}>
                                Audio
                              </Text>
                              <Group gap="xs" align="center">
                                <FileButton
                                  onChange={(file) =>
                                    handlePhraseAudioUpload(
                                      file,
                                      langIndex,
                                      phraseIndex,
                                    )
                                  }
                                  accept="audio/*"
                                >
                                  {(props) => (
                                    <Button
                                      {...props}
                                      variant="light"
                                      size="xs"
                                      leftSection={<IconUpload size={14} />}
                                      loading={
                                        uploadingAudioIndex?.langIndex ===
                                          langIndex &&
                                        uploadingAudioIndex?.phraseIndex ===
                                          phraseIndex
                                      }
                                    >
                                      {phrase.audioUrl ? "Change" : "Upload"}
                                    </Button>
                                  )}
                                </FileButton>
                                {phrase.audioUrl && (
                                  <Tooltip label="Remove audio">
                                    <ActionIcon
                                      color="red"
                                      variant="light"
                                      size="sm"
                                      onClick={() =>
                                        updatePhraseAudioUrl(
                                          langIndex,
                                          phraseIndex,
                                          undefined,
                                        )
                                      }
                                    >
                                      <IconX size={14} />
                                    </ActionIcon>
                                  </Tooltip>
                                )}
                              </Group>
                              {phrase.audioUrl && (
                                <audio
                                  controls
                                  src={getMediaUrl(phrase.audioUrl)}
                                  style={{
                                    width: "100%",
                                    height: 32,
                                    marginTop: 8,
                                  }}
                                />
                              )}
                            </Box>
                          </Stack>
                          <Tooltip label="Remove phrase">
                            <ActionIcon
                              color="red"
                              variant="light"
                              mt={24}
                              onClick={() =>
                                removePhrase(langIndex, phraseIndex)
                              }
                            >
                              <IconX size={16} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </Paper>
                    ))}
                    <Button
                      variant="outline"
                      size="xs"
                      leftSection={<IconPlus size={14} />}
                      onClick={() => addPhrase(langIndex)}
                    >
                      Add Phrase
                    </Button>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}
        </Box>

        <Divider />

        {/* Contents */}
        <Box>
          <Group gap="xs" mb="md" justify="space-between">
            <Group gap="xs">
              <Text fw={600}>Content</Text>
              <Badge size="sm" variant="light">
                {contents.length}
              </Badge>
            </Group>
            <Button
              variant="light"
              size="xs"
              leftSection={<IconPlus size={14} />}
              onClick={addContent}
            >
              Add Content
            </Button>
          </Group>
          {contents.length === 0 ? (
            <Text c="dimmed" size="sm">
              No content added
            </Text>
          ) : (
            <Stack gap="md">
              {contents.map((content, contentIndex) => {
                const isYouTube = content.contentType === "VIDEO_YOUTUBE";
                const isVideo =
                  content.contentType === "UPLOAD" &&
                  content.contentUrl?.match(/\.(mp4|webm)$/i);
                const isImage = content.contentType === "UPLOAD" && !isVideo;
                const youtubeId =
                  isYouTube && content.contentUrl
                    ? content.contentUrl.match(
                        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/,
                      )?.[1]
                    : null;

                return (
                  <Paper key={content.id} p="sm" withBorder>
                    <Stack gap="sm">
                      <Group
                        justify="space-between"
                        align="flex-start"
                        gap="xs"
                      >
                        <Textarea
                          label="Description"
                          placeholder="What is this content about?"
                          rows={3}
                          value={content.title}
                          onChange={(e) =>
                            updateContentTitle(contentIndex, e.target.value)
                          }
                          size="sm"
                          style={{ flex: 1 }}
                        />
                        <Tooltip label="Remove content">
                          <ActionIcon
                            color="red"
                            variant="light"
                            mt={24}
                            onClick={() => removeContent(contentIndex)}
                          >
                            <IconX size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>

                      <Group gap="sm">
                        <Box style={{ width: 150 }}>
                          <Text size="xs" fw={500} mb={4}>
                            Type
                          </Text>
                          <Group gap="xs">
                            <Button
                              variant={isYouTube ? "filled" : "light"}
                              size="xs"
                              onClick={() =>
                                updateContentType(contentIndex, "VIDEO_YOUTUBE")
                              }
                            >
                              YouTube
                            </Button>
                            <Button
                              variant={!isYouTube ? "filled" : "light"}
                              size="xs"
                              onClick={() =>
                                updateContentType(contentIndex, "UPLOAD")
                              }
                            >
                              Upload
                            </Button>
                          </Group>
                        </Box>
                        {isYouTube ? (
                          <TextInput
                            label="YouTube URL"
                            placeholder="https://youtube.com/watch?v=..."
                            value={content.contentUrl || ""}
                            onChange={(e) =>
                              updateContentUrl(contentIndex, e.target.value)
                            }
                            size="sm"
                            style={{ flex: 1 }}
                          />
                        ) : (
                          <Box style={{ flex: 1 }}>
                            <Text size="xs" fw={500} mb={4}>
                              File
                            </Text>
                            <Group gap="xs">
                              <FileButton
                                onChange={(file) =>
                                  handleContentUpload(file, contentIndex)
                                }
                                accept="image/*,video/*"
                              >
                                {(props) => (
                                  <Button
                                    {...props}
                                    variant="light"
                                    size="xs"
                                    leftSection={<IconUpload size={14} />}
                                    loading={
                                      uploadingContentIndex === contentIndex
                                    }
                                  >
                                    {content.contentUrl
                                      ? "Change File"
                                      : "Upload File"}
                                  </Button>
                                )}
                              </FileButton>
                              {content.contentUrl && (
                                <Text
                                  size="xs"
                                  c="dimmed"
                                  style={{ flex: 1 }}
                                  lineClamp={1}
                                >
                                  {content.contentUrl}
                                </Text>
                              )}
                            </Group>
                          </Box>
                        )}
                      </Group>

                      {/* YouTube embed */}
                      {isYouTube && youtubeId && (
                        <Box
                          style={{
                            position: "relative",
                            paddingBottom: "56.25%",
                            height: 0,
                          }}
                        >
                          <iframe
                            src={`https://www.youtube.com/embed/${youtubeId}`}
                            style={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              width: "100%",
                              height: "100%",
                              border: 0,
                              borderRadius: 8,
                            }}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </Box>
                      )}

                      {/* Video player */}
                      {isVideo && content.contentUrl && (
                        <video
                          controls
                          style={{ width: "100%", borderRadius: 8 }}
                        >
                          <source
                            src={getMediaUrl(content.contentUrl)}
                            type="video/mp4"
                          />
                        </video>
                      )}

                      {/* Image */}
                      {isImage && content.contentUrl && (
                        <Box
                          style={{
                            position: "relative",
                            width: "100%",
                            aspectRatio: "16/9",
                          }}
                        >
                          <Image
                            src={getMediaUrl(content.contentUrl)}
                            alt={content.title}
                            fill
                            style={{ objectFit: "contain", borderRadius: 8 }}
                            unoptimized
                          />
                        </Box>
                      )}
                    </Stack>
                  </Paper>
                );
              })}
            </Stack>
          )}
        </Box>

        <Divider />

        {/* Actions */}
        <Group justify="space-between">
          <Button
            color="red"
            variant="outline"
            leftSection={<IconTrash size={16} />}
            onClick={openDeleteModal}
          >
            Delete
          </Button>

          <Group>
            {culture.state === "pending" && (
              <Button
                color="green"
                leftSection={<IconCheck size={16} />}
                onClick={handleApprove}
                loading={saving}
              >
                Approve
              </Button>
            )}
            <Button
              leftSection={<IconDeviceFloppy size={16} />}
              onClick={handleSave}
              loading={saving}
              disabled={!hasChanges}
            >
              Save Changes
            </Button>
          </Group>
        </Group>
      </Stack>

      {/* Delete Confirmation Modal */}
      <Modal
        opened={deleteModalOpened}
        onClose={closeDeleteModal}
        title="Delete Culture"
        centered
      >
        <Stack gap="md">
          <Text>
            Delete <strong>{culture.name}</strong>? This will permanently remove
            the culture and all associated files. This cannot be undone.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={closeDeleteModal}>
              Cancel
            </Button>
            <Button color="red" onClick={handleDelete} loading={deleting}>
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Boundary Edit Modal */}
      <Modal
        opened={boundaryModalOpened}
        onClose={closeBoundaryModal}
        title="Edit Territory Boundary"
        size="xl"
        centered
      >
        <Stack gap="md">
          {/* Drawing controls */}
          <Group gap="sm">
            <Tooltip label="Add (paint territory)">
              <ActionIcon
                variant={brushMode === "add" ? "filled" : "light"}
                color="blue"
                onClick={() => setBrushMode("add")}
              >
                <IconPlus size={16} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Erase">
              <ActionIcon
                variant={brushMode === "erase" ? "filled" : "light"}
                color="red"
                onClick={() => setBrushMode("erase")}
              >
                <IconEraser size={16} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Pan mode (hold to drag map)">
              <ActionIcon
                variant={showMode ? "filled" : "light"}
                color="gray"
                onClick={() => setShowMode(!showMode)}
              >
                <IconHandMove size={16} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Undo">
              <ActionIcon
                variant="light"
                onClick={handleBoundaryUndo}
                disabled={polygonHistory.length === 0}
              >
                <IconArrowBackUp size={16} />
              </ActionIcon>
            </Tooltip>
            <Box style={{ flex: 1, maxWidth: 200 }}>
              <Text size="xs" c="dimmed" mb={4}>
                Brush size: {Math.round(radiusKm)} km
              </Text>
              <Slider
                value={brushSize}
                onChange={setBrushSize}
                min={0}
                max={100}
                size="sm"
              />
            </Box>
          </Group>

          {/* Map */}
          <Paper withBorder p={0} className="overflow-hidden">
            <div
              ref={editMapContainerRef}
              style={{ height: 400, width: "100%" }}
            />
          </Paper>

          <Text size="xs" c="dimmed">
            Click and drag to paint territory. Use Add mode to expand, Erase
            mode to remove areas. Toggle Pan mode to move the map without
            drawing.
          </Text>

          <Group justify="flex-end">
            <Button variant="default" onClick={closeBoundaryModal}>
              Cancel
            </Button>
            <Button onClick={saveBoundaryEdit}>Save Boundary</Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}
