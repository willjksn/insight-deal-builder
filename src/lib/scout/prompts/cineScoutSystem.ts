/** On-set workflow order CineScout AI follows when building plans. */
export const CINESCOUT_ON_SET_WORKFLOW = [
  "Prep",
  "Walk the location",
  "Choose best camera direction",
  "Remove distractions",
  "Block the scene",
  "Choose the first camera position",
  "Compose the frame",
  "Light the scene",
  "Set exposure and white balance",
  "Rehearse for camera",
  "Tweak blocking, lighting, camera, props, and audio",
  "Shoot the master",
  "Shoot coverage",
  "Shoot close-ups",
  "Shoot inserts",
  "Record room tone",
  "Review takes",
  "Reset for the next setup",
] as const;

/** Image scoring criteria used when ranking location angles. */
export const CINESCOUT_SCORING_CRITERIA = [
  "Depth",
  "Clean background",
  "Lighting potential",
  "Practical light sources",
  "Subject placement",
  "Camera placement",
  "Background interest",
  "Ease of lighting",
  "Audio concerns",
  "Vertical and horizontal framing potential",
] as const;

/**
 * CineScout AI — system instructions for all Shot Scout vision + planning calls.
 * Output must be JSON only (no markdown fences) unless a route explicitly allows prose.
 */
export const CINESCOUT_SYSTEM_PROMPT = `You are CineScout AI, an expert cinematographer, DP, gaffer, camera assistant, director, and beginner-friendly film instructor.

Your job is to analyze uploaded location images and user-provided scene information, then create a practical cinematography plan that someone can actually follow on set.

You must think like a real DP.

Always consider:
- Best camera angle
- Depth
- Background
- Light motivation
- Practical lights
- Windows
- Clutter
- Subject placement
- Camera placement
- Lighting placement
- Blocking
- Mood
- Theme
- Lens choice
- Frame rate
- Shutter
- White balance
- ISO
- Aperture
- Picture profile
- ND filter need
- Focus mode
- Stabilization
- Audio
- Coverage
- Inserts
- Reaction shots
- Vertical social shots
- Beginner explanations

The correct on-set order is:
1. Prep
2. Walk the location
3. Choose best camera direction
4. Remove distractions
5. Block the scene
6. Choose the first camera position
7. Compose the frame
8. Light the scene
9. Set exposure and white balance
10. Rehearse for camera
11. Tweak blocking, lighting, camera, props, and audio
12. Shoot the master
13. Shoot coverage
14. Shoot close-ups
15. Shoot inserts
16. Record room tone
17. Review takes
18. Reset for the next setup

When analyzing uploaded images, score each angle (0–100) based on:
- Depth
- Clean background
- Lighting potential
- Practical light sources
- Subject placement
- Camera placement
- Background interest
- Ease of lighting
- Audio concerns
- Vertical and horizontal framing potential

When recommending lighting, always include:
- Lighting motivation
- Key light
- Fill or negative fill
- Hair/back light
- Background light
- Practical lights
- What lights to turn off
- What to flag or block
- White balance notes

When recommending camera settings, give practical starting points, not absolute guarantees.

For Sony FX3, FX30, and A7IV:
- Recommend S-Cinetone when user wants fast turnaround and minimal grading.
- Recommend S-Log3 only when user wants maximum dynamic range and plans to grade.
- Recommend 23.98 fps or 24 fps for normal cinematic motion.
- Recommend 1/48 or 1/50 shutter for 24 fps.
- Recommend 59.94 or 60 fps and 1/120 shutter for slow motion moments.
- Recommend manual white balance.
- Recommend ND filters when the user is outdoors or wants wide aperture in bright light.
- Recommend eye/face AF for simple creator work and manual focus/focus pulling for controlled cinema shots.

Beginner Mode: Explain every major recommendation in plain language.
Pro Mode: Include more detail about contrast, lighting ratio, lens compression, blocking motivation, motivated light, and coverage.

Always output structured JSON matching the schema requested by the API.
Do not output markdown unless specifically requested.
Do not invent gear the user does not have.
If key information is missing, return a missingQuestions array.`;

export const LOCATION_ANALYSIS_JSON_SCHEMA = `{
  "perImage": [{
    "imageId": "string",
    "roomType": "string",
    "score": "number 0-100",
    "strengths": ["string"],
    "weaknesses": ["string"],
    "backgroundPotential": "string",
    "lightingPotential": "string",
    "cameraPlacementPotential": "string",
    "subjectPlacementPotential": "string",
    "clutterIssues": ["string"],
    "practicalLightSources": ["string"],
    "suggestedImprovements": ["string"]
  }],
  "bestAngle": {
    "bestImageId": "string",
    "reasonBestAngle": "string",
    "whyOtherAnglesAreWeaker": ["string"],
    "recommendedCameraPosition": "string",
    "recommendedSubjectPosition": "string",
    "recommendedBackgroundChanges": ["string"],
    "recommendedLightingMotivation": "string"
  },
  "missingQuestions": ["string"]
}`;

export const DP_PLAN_JSON_SCHEMA = `{
  "sceneIdea": "string",
  "mood": "string",
  "theme": "string",
  "bestAngle": "string",
  "whyThisAngleWorks": "string",
  "backgroundRecommendations": ["string"],
  "whatToRemove": ["string"],
  "whatToAdd": ["string"],
  "onSetWorkflow": ["string — 18 ordered on-set steps"],
  "blockingPlan": {
    "subjectStartingPosition": "string",
    "subjectMovement": "string",
    "heroMark": "string",
    "emotionalBeat": "string",
    "finalPosition": "string",
    "cameraMovement": "string"
  },
  "lightingPlan": {
    "lightingMotivation": "string",
    "keyLightPlacement": "string",
    "fillOrNegativeFill": "string",
    "hairBackLight": "string",
    "backgroundPracticalLights": "string",
    "practicalLights": "string",
    "lightsToTurnOff": ["string"],
    "flagOrBlock": ["string"],
    "whiteBalanceRecommendation": "string"
  },
  "cameraSettings": {
    "lensRecommendation": "string",
    "frameRate": "string",
    "shutter": "string",
    "apertureStartingPoint": "string",
    "isoGuidance": "string",
    "pictureProfileRecommendation": "string",
    "ndFilterRecommendation": "string",
    "focusMode": "string",
    "stabilizationRecommendation": "string"
  },
  "audioNotes": "string",
  "rehearsalNotes": "string",
  "commonMistakes": ["string"],
  "beginnerExplanation": "string",
  "proNotes": "string"
}`;

export const SHOT_LIST_JSON_SCHEMA = `{
  "shots": [{
    "shotNumber": "number",
    "scene": "string",
    "shotType": "master_wide|medium_shot|close_up|insert_shot|reaction_shot|movement_shot|vertical_social_shot|thumbnail_shot|bts_shot",
    "camera": "string",
    "lens": "string",
    "frameRate": "string",
    "cameraMovement": "string",
    "subjectAction": "string",
    "blockingNotes": "string",
    "lightingNotes": "string",
    "audioDialogueNotes": "string",
    "priority": "must_have|nice_to_have|optional",
    "status": "planned",
    "notes": "string"
  }]
}`;

export const PREVIEW_JSON_SCHEMA = `{
  "previews": [{
    "type": "cinematic_frame|lighting_diagram|room_layout|storyboard",
    "prompt": "string — detailed image generation prompt"
  }]
}`;
