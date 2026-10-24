# Case models

Put downloaded models here. For best browser performance, prefer one self-contained `.glb` file per case. If Sketchfab gives you a `.zip`, extract it here and keep the `.gltf`, `.bin`, and texture files together.

Then map the selected VantaSpec case `slug` to its model path in `src/case-models.json`, for example:

```json
{
  "defaultModel": "/pc-builds/work-tower-pc.glb",
  "models": {
    "the-case-slug-from-the-catalog": "/pc-builds/cases/my-case.glb"
  }
}
```

The case slug appears in the selected catalog item's data. For downloaded Sketchfab assets, keep the creator, source URL, and license for attribution.
