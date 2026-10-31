MediaPipe Tasks Vision (hand tracking for the movement games, face tracking for Make a Face)

vision_bundle.mjs, wasm/vision_wasm_internal.*  : @mediapipe/tasks-vision 1.2.0, Apache License 2.0, copyright Google LLC
hand_landmarker.task                            : MediaPipe Hand Landmarker model, Apache License 2.0, copyright Google LLC
face_landmarker.task                            : MediaPipe Face Landmarker model (with blendshapes) for Make a Face, supplied in the co game.zip game folder, Apache License 2.0, copyright Google LLC

They are served from this folder so the game works with no internet connection.
Video from the camera is processed inside the browser and is never recorded or sent anywhere.
