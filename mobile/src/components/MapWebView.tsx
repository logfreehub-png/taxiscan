import React, { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import { StyleProp, ViewStyle } from "react-native";
import { WebView } from "react-native-webview";

const TASHKENT = { lat: 41.311, lng: 69.279 };

export interface MapMarker {
  lat: number;
  lng: number;
  type?: "start" | "end" | "stop";
  /** Pin markazida ko'rsatiladigan harf (masalan "A" / "B" / "C") */
  label?: string;
}

export interface MapRoute {
  id: number;
  coords: [number, number][]; // [lat, lng] juftliklar
  color?: string;
  selected?: boolean;
}

export interface MapZone {
  id: number;
  name?: string;
  rings: [number, number][][];
  highlighted?: boolean;
  color?: string;
}

export interface MapWebViewHandle {
  /** Xaritani berilgan koordinataga markazlash */
  recenter: (lat: number, lng: number, zoom?: number) => void;
}

interface Props {
  mode: "picker" | "route" | "zones";
  isDark?: boolean;
  center?: { lat: number; lng: number } | null;
  zoom?: number;
  markers?: MapMarker[];
  routes?: MapRoute[];
  zones?: MapZone[];
  userLoc?: { lat: number; lng: number } | null;
  onCenterChange?: (lat: number, lng: number) => void;
  onRoutePress?: (id: number) => void;
  onZonePress?: (id: number) => void;
  style?: StyleProp<ViewStyle>;
}

function buildHtml(props: Props): string {
  const { mode, isDark, center, zoom = 15, markers = [], routes = [], zones = [], userLoc = null } = props;
  const c = center || TASHKENT;
  // Kalitsiz (tekin) OpenStreetMap plitkalari. Qorong'i rejimda CSS filtr bilan
  // xaritani qoraytiramiz — CartoCDN endi API kalit talab qiladi ("API KEY REQUIRED").
  const tiles = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

  const markersJson = JSON.stringify(markers);
  const routesJson = JSON.stringify(routes);
  const zonesJson = JSON.stringify(zones);

  const pinOuter = isDark ? "#FFCC00" : "#0F1216";
  const pinInner = isDark ? "#FFFFFF" : "#FFCC00";
  const pinCore = isDark ? "#FFCC00" : "#0F1216";

  // Markaziy statik poydevor belgisi — faqat markerlar va yo'l chizig'i bo'lmaganda ko'rinadi (dublikat pinni oldini olish)
  const showCenterPin = mode === "picker" && markers.length === 0 && routes.length === 0;

  const pinHtml = showCenterPin
    ? `<div id="pin">
         <svg width="42" height="54" viewBox="0 0 40 52" xmlns="http://www.w3.org/2000/svg">
           <path d="M20 0C9 0 0 9 0 20c0 14 20 32 20 32s20-18 20-32C40 9 31 0 20 0z" fill="${pinOuter}"/>
           <circle cx="20" cy="20" r="13" fill="${pinInner}"/>
           <circle cx="20" cy="20" r="5" fill="${pinCore}"/>
         </svg>
         <div id="pin-shadow"></div>
       </div>`
    : "";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  html, body, #map { height: 100%; margin: 0; padding: 0; background: ${isDark ? "#0A0D11" : "#e8eaed"}; touch-action: auto; }
  .leaflet-control-attribution { display: none; }
  .leaflet-container { background: ${isDark ? "#0A0D11" : "#e8eaed"}; }
  ${isDark
    ? `.leaflet-tile {
         /* OSM plitkalarini "Dark Matter" uslubiga yaqin — neytral, mu'tadil qora xaritaga aylantiradi.
            saturate(0.5) ranglarni bosadi (suv/parklar g'alati chiqmaydi), brightness/contrast qoraytiradi. */
         filter: invert(1) hue-rotate(180deg) brightness(0.88) contrast(0.92) saturate(0.5) sepia(0.08);
       }`
    : ""}
  #pin {
    position: fixed; left: 50%; top: 50%;
    transform: translate(-50%, -100%);
    margin-top: 6px; z-index: 1000; pointer-events: none;
    filter: drop-shadow(0 6px 10px rgba(0,0,0,.5));
  }
  #pin-shadow {
    position: absolute; left: 50%; bottom: -4px; transform: translateX(-50%);
    width: 16px; height: 6px; background: rgba(0,0,0,.35); border-radius: 50%;
  }
  .tn-dot {
    border-radius: 50%; border: 3px solid #fff;
    box-shadow: 0 2px 8px rgba(0,0,0,.5);
  }
  .tn-zone-label {
    background: transparent; border: 0; box-shadow: none;
    color: ${isDark ? "#F3F5F7" : "#0F1216"};
    font-weight: 800; font-size: 11px;
    text-shadow: 0 1px 3px ${isDark ? "rgba(0,0,0,.9)" : "rgba(255,255,255,.9)"};
  }
  .tn-zone-label::before { display: none; }
</style>
</head>
<body>
<div id="map"></div>
${pinHtml}
<script>
  var post = function(o){ if(window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(o)); };
  var map = L.map('map', { zoomControl: false, attributionControl: false, touchZoom: true, dragging: true })
            .setView([${c.lat}, ${c.lng}], ${zoom});
  L.tileLayer('${tiles}', { subdomains: ['a','b','c'], maxZoom: 19 }).addTo(map);

  var MODE = '${mode}';
  var SHOW_PIN = ${showCenterPin ? "true" : "false"};
  var markers = ${markersJson};
  var routes = ${routesJson};
  var zones = ${zonesJson};
  var userLoc = ${userLoc ? JSON.stringify(userLoc) : "null"};
  var DARK = ${isDark ? "true" : "false"};

  function makeDot(color, size){
    return L.divIcon({ className: '', iconSize: [size, size], iconAnchor: [size/2, size/2],
      html: '<div class="tn-dot" style="width:'+size+'px;height:'+size+'px;background:'+color+'"></div>' });
  }

  // Yandex uslubidagi unikal manzil pini (A, B, C...)
  function makePin(fill, letter){
    var w = 40, h = 50;
    var svg = '<svg width="'+w+'" height="'+h+'" viewBox="0 0 40 50" xmlns="http://www.w3.org/2000/svg">'
      + '<circle cx="20" cy="20" r="19" fill="rgba(255,204,0,0.25)"/>'
      + '<path d="M20 4C11.2 4 4 11.2 4 20c0 11 16 26 16 26s16-15 16-26C36 11.2 28.8 4 20 4z" fill="'+fill+'"/>'
      + '<circle cx="20" cy="20" r="12" fill="#FFFFFF"/>'
      + '<text x="20" y="25" text-anchor="middle" font-size="14" font-weight="900" fill="#0F1216" font-family="system-ui,Arial">'+(letter||'')+'</text>'
      + '</svg>';
    return L.divIcon({ className: 'tn-pin', iconSize: [w, h], iconAnchor: [w/2, h], html: svg });
  }

  // 1. Haqiqiy ko'cha geometriyasi yo'l chizig'ini (Polyline) chizish
  var routeBounds = [];
  if (routes && routes.length > 0) {
    routes.forEach(function(rt){
      if (!rt.coords || rt.coords.length < 2) return;
      var isSel = rt.selected;
      var line = L.polyline(rt.coords, {
        color: rt.color || (isSel ? '#FFCC00' : '#7C8491'),
        weight: isSel ? 6 : 4,
        opacity: isSel ? 0.95 : 0.5,
        dashArray: isSel ? null : '6 6',
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);
      line.on('click', function(){ post({ type: 'route', id: rt.id }); });
      if (isSel) {
        rt.coords.forEach(function(p){ routeBounds.push(p); });
      }
    });
  }

  // 2. Nuqtalar va pinlarni o'rnatish
  if (markers && markers.length > 0) {
    markers.forEach(function(m, idx){
      if (!m.lat || !m.lng) return;
      var fill = '#FFCC00';
      var letter = m.label || String.fromCharCode(65 + idx);
      L.marker([m.lat, m.lng], { icon: makePin(fill, letter) }).addTo(map);
      routeBounds.push([m.lat, m.lng]);
    });
  }

  // 3. Marshrut chizilgan bo'lsa xaritani barcha nuqtalarga moslab joylash
  if (routeBounds.length > 1) {
    try { map.fitBounds(routeBounds, { padding: [60, 60], maxZoom: 16 }); } catch(e){}
  }

  if (MODE === 'zones') {
    var zbounds = [];
    var selBounds = null;
    zones.forEach(function(z){
      var stroke = z.color || (z.highlighted ? '#0F1216' : (DARK ? '#8b949e' : '#5C6772'));
      var fill = z.highlighted ? '#FFCC00' : (z.color || (DARK ? '#3a4150' : '#5C6772'));
      (z.rings || []).forEach(function(ring){
        if (!ring || ring.length < 3) return;
        var poly = L.polygon(ring, {
          color: stroke,
          weight: z.highlighted ? 3 : 1.2,
          opacity: z.highlighted ? 1 : 0.6,
          fillColor: fill,
          fillOpacity: z.highlighted ? 0.45 : (DARK ? 0.18 : 0.12)
        }).addTo(map);
        poly.on('click', function(){ post({ type: 'zone', id: z.id }); });
        if (z.name) poly.bindTooltip(z.name, {
          permanent: true, direction: 'center', className: 'tn-zone-label'
        });
        ring.forEach(function(p){ zbounds.push(p); });
        if (z.highlighted) {
          if (!selBounds) selBounds = [];
          ring.forEach(function(p){ selBounds.push(p); });
        }
      });
    });

    if (userLoc) {
      L.marker([userLoc.lat, userLoc.lng], { icon: makeDot('#FF3B30', 18), zIndexOffset: 1000 })
        .addTo(map).bindTooltip('Siz shu yerda', { direction: 'top' });
    }

    if (selBounds && selBounds.length) {
      try { map.fitBounds(selBounds, { padding: [40, 40], maxZoom: 13 }); } catch(e){}
    } else if (userLoc) {
      try { map.setView([userLoc.lat, userLoc.lng], 13); } catch(e){}
    } else if (zbounds.length > 0) {
      try { map.fitBounds(zbounds, { padding: [30, 30], maxZoom: 13 }); } catch(e){}
    }
  }

  if (MODE === 'picker' && SHOW_PIN) {
    var lastLat = null, lastLng = null, emitTimer = null;
    var emit = function(){
      var ctr = map.getCenter();
      if (lastLat !== null) {
        var dLat = Math.abs(ctr.lat - lastLat);
        var dLng = Math.abs(ctr.lng - lastLng);
        if (dLat < 0.00005 && dLng < 0.00005) return;
      }
      lastLat = ctr.lat; lastLng = ctr.lng;
      post({ type: 'center', lat: ctr.lat, lng: ctr.lng });
    };
    var debouncedEmit = function(){
      if (emitTimer) clearTimeout(emitTimer);
      emitTimer = setTimeout(emit, 250);
    };
    map.on('moveend', debouncedEmit);
    setTimeout(emit, 300);
  }

  window.recenter = function(lat, lng, z){ map.setView([lat, lng], z || map.getZoom()); };
  post({ type: 'ready' });
</script>
</body>
</html>`;
}

export const MapWebView = forwardRef<MapWebViewHandle, Props>(function MapWebView(props, ref) {
  const webRef = useRef<WebView>(null);

  const html = useMemo(
    () => buildHtml(props),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      props.mode,
      props.isDark,
      JSON.stringify(props.markers),
      JSON.stringify(props.routes),
      JSON.stringify(props.zones),
      JSON.stringify(props.userLoc),
    ]
  );

  useImperativeHandle(ref, () => ({
    recenter: (lat, lng, zoom) => {
      webRef.current?.injectJavaScript(
        `window.recenter && window.recenter(${lat}, ${lng}, ${zoom ?? "undefined"}); true;`
      );
    },
  }));

  return (
    <WebView
      ref={webRef}
      originWhitelist={["*"]}
      source={{ html }}
      style={props.style}
      javaScriptEnabled
      domStorageEnabled
      nestedScrollEnabled
      androidLayerType="hardware"
      onMessage={(e) => {
        try {
          const msg = JSON.parse(e.nativeEvent.data);
          if (msg.type === "center" && props.onCenterChange) {
            props.onCenterChange(msg.lat, msg.lng);
          } else if (msg.type === "route" && props.onRoutePress) {
            props.onRoutePress(msg.id);
          } else if (msg.type === "zone" && props.onZonePress) {
            props.onZonePress(msg.id);
          }
        } catch {
          /* ignore */
        }
      }}
    />
  );
});
