# Astronomy data and attribution

Orrery bundles a bounded offline snapshot. The data are not a live discovery feed and are not spacecraft navigation ephemerides.

## HYG v4.1

Source: David Nash / Astronomy Nexus and HYG contributors, [HYG Database](https://github.com/astronexus/HYG-Database), [README and field definitions](https://github.com/astronexus/HYG-Database/blob/main/hyg/README.md).

The bundled subset contains **3,934 records within 30 parsecs**. It retains catalog IDs, names/aliases, spectral classifications, equatorial Cartesian positions in parsecs, distance, magnitude, color index, and luminosity proxy. Missing fields remain null. The application rotates positions into J2000 ecliptic coordinates. Sol is renamed Sun and placed at the exact heliocentric origin; the source's artificial small nonzero Sun position is discarded. Common Gliese identifiers are given readable names.

The subset and its adaptations are licensed **Creative Commons Attribution-ShareAlike 4.0 International**. See [the bundled legal code](../src/astronomy/data/LICENSE-HYG.txt) and [license overview](https://creativecommons.org/licenses/by-sa/4.0/). This data license applies to the HYG-derived data, not automatically to Orrery's software or the other datasets. Downstream catalog adaptations must retain attribution and the same license.

HYG luminosities derived from visual magnitude are labeled **visual magnitude proxies**. They must not be silently treated as bolometric luminosities for habitability calculations. The Sun uses the existing solar reference; the Proxima entry uses NASA composite bolometric parameters for its host where available. HYG does not supply reliable masses, radii, temperatures or stellar lifetimes for every object. Those fields are Unknown rather than synthesized from spectral type.

## NASA Exoplanet Archive

The snapshot contains **19 planets in five systems**: Proxima Cen, TRAPPIST-1, Kepler-186, Kepler-452, TOI-700.

Data: [NASA Exoplanet Archive TAP API](https://exoplanetarchive.ipac.caltech.edu/docs/API_resources.html), composite table **pscomppars**, [column definitions](https://exoplanetarchive.ipac.caltech.edu/docs/API_PS_columns.html).

NASA Exoplanet Archive is operated by the California Institute of Technology under contract with NASA under the Exoplanet Exploration Program. Scientific work based on this data should also cite the archive and the underlying publications relevant to each measurement.

Composite rows can combine different publications. The download preserves radius/mass error columns and mass provenance. Mass-radius relationship values are **Estimated**; Msini values are **Minimum mass**. Nulls stay Unknown. Catalog composite values are not represented as perfectly known or simultaneously measured.

The system view uses catalog orbit scales, illustrative coplanar geometry, and illustrative phase. A transit inclination is not silently interpreted as ecliptic inclination. No observed complete inertial state vectors are claimed. Creating an editable copy uses local barycentric SI state, catalog masses/radii when known, explicitly configured fallback values when absent, and normal N-body propagation.

## Galaxy schematic

Milky Way: approximate Sun-to-center distance 26,000 light-years, schematic disk diameter 100,000 light-years. Sagittarius A* is a location marker, never a Solar System gravity source.

Andromeda: approximate distance 2.5 million light-years and schematic extent informed by [NASA/JPL PIA15416](https://www.jpl.nasa.gov/images/pia15416-andromeda/). Triangulum: approximate distance 3 million light-years, [NASA image article](https://www.nasa.gov/image-article/triangulum-galaxy/). Approximate center directions orient the markers; spiral clouds and orientations are illustrative. Satellite galaxies and galactic dynamics are not modeled.

## Refresh

Run from the repository root:

~~~powershell
.\.venv\Scripts\python.exe scripts/update_astronomy.py
~~~

The script requests only the stated nearby-star subset and five hosts, checks HTTP errors, rejects empty archive results, writes finite JSON, and records retrieval time, exact TAP query and sources in [metadata.json](../src/astronomy/data/metadata.json). Review the resulting data changes before publishing. Refresh is a development action, not an automatic runtime network dependency.
