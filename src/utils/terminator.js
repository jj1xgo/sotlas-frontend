// Day/night terminator and twilight band calculation.
//
// Sun position algorithm (ecliptic -> equatorial coordinates, GMST) ported from
// Leaflet.Terminator (https://github.com/joergdietrich/Leaflet.Terminator, MIT license),
// which in turn implements the low-precision solar position formulas from the
// Astronomical Almanac. Extended here to support arbitrary depression angles so
// that civil/nautical/astronomical twilight bands can be computed, not just the
// geometric (0.833°) terminator.

const D2R = Math.PI / 180
const R2D = 180 / Math.PI

// Depression angle of the sun below the horizon, in degrees, for each named band.
// 'night' matches the standard terminator (accounting for atmospheric refraction
// and the sun's apparent radius); the twilight bands follow the usual astronomical
// definitions.
export const DEPRESSION_ANGLES = {
  night: 0.833,
  civil: 6,
  nautical: 12,
  astronomical: 18
}

function toJulian (date) {
  return (date.getTime() / 86400000) + 2440587.5
}

function gmst (julianDay) {
  const d = julianDay - 2451545.0
  return (18.697374558 + 24.06570982441908 * d) % 24
}

function sunEclipticPosition (julianDay) {
  const n = julianDay - 2451545.0
  let meanLongitude = 280.460 + 0.9856474 * n
  meanLongitude %= 360
  let meanAnomaly = 357.528 + 0.9856003 * n
  meanAnomaly %= 360
  const lambda = meanLongitude + 1.915 * Math.sin(D2R * meanAnomaly) +
    0.02 * Math.sin(D2R * 2 * meanAnomaly)
  return { lambda }
}

function eclipticObliquity (julianDay) {
  const n = julianDay - 2451545.0
  const t = n / 36525
  return 23.43929111 -
    t * (46.836769 / 3600 -
      t * (0.0001831 / 3600 +
        t * (0.00200340 / 3600 -
          t * (0.576e-6 / 3600 - t * 4.34e-8 / 3600))))
}

function sunEquatorialPosition (sunEclLng, eclObliq) {
  let alpha = R2D * Math.atan(Math.cos(D2R * eclObliq) * Math.tan(D2R * sunEclLng))
  const delta = R2D * Math.asin(Math.sin(D2R * eclObliq) * Math.sin(D2R * sunEclLng))
  const lQuadrant = Math.floor(sunEclLng / 90) * 90
  const raQuadrant = Math.floor(alpha / 90) * 90
  alpha += (lQuadrant - raQuadrant)
  return { alpha, delta }
}

function hourAngle (lng, sunPos, gst) {
  const lst = gst + lng / 15
  return lst * 15 - sunPos.alpha
}

/**
 * Latitude of the point on the given meridian where the sun's altitude equals
 * -depressionAngle (i.e. the boundary of a twilight band), or null if the sun
 * never reaches that altitude at this longitude on this day (polar day/night).
 */
function boundaryLatitude (lng, sunPos, gst, depressionAngle) {
  const ha = D2R * hourAngle(lng, sunPos, gst)
  const delta = D2R * sunPos.delta
  const targetSinAltitude = Math.sin(D2R * -depressionAngle)

  const a = Math.sin(delta)
  const b = Math.cos(delta) * Math.cos(ha)
  const r = Math.sqrt(a * a + b * b)

  if (Math.abs(targetSinAltitude / r) > 1) {
    // The sun never crosses this depression angle at this longitude today
    // (polar day if the sun stays above it, polar night if it stays below).
    return null
  }

  const phi = Math.atan2(b, a)
  return R2D * (Math.asin(targetSinAltitude / r) - phi)
}

/**
 * Computes the polygon covering the night side of the earth (sun altitude below
 * -depressionAngle) as a GeoJSON FeatureCollection with a single Polygon feature,
 * in [lng, lat] order. `date` should be a native Date (UTC-based calculation).
 */
export function nightPolygon (date, depressionAngle, resolutionPerDegree = 2) {
  const julianDay = toJulian(date)
  const gst = gmst(julianDay)
  const sunEclPos = sunEclipticPosition(julianDay)
  const eclObliq = eclipticObliquity(julianDay)
  const sunEqPos = sunEquatorialPosition(sunEclPos.lambda, eclObliq)

  const nightPole = sunEqPos.delta >= 0 ? -90 : 90
  const coordinates = []
  const steps = 360 * resolutionPerDegree

  for (let i = 0; i <= steps; i++) {
    const lng = -180 + i / resolutionPerDegree
    let lat = boundaryLatitude(lng, sunEqPos, gst, depressionAngle)
    if (lat === null) {
      // Polar day/night at this longitude: clamp to the pole on the night side
      // so the ring stays valid instead of leaving a gap.
      lat = nightPole
    }
    coordinates.push([lng, lat])
  }

  // Close the ring across the pole on the night side of the globe.
  if (nightPole < 0) {
    coordinates.push([180, -90], [-180, -90])
  } else {
    coordinates.push([180, 90], [-180, 90])
  }
  coordinates.push(coordinates[0])

  return {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [coordinates]
      }
    }]
  }
}
