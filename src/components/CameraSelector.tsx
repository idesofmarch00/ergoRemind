interface CameraSelectorProps {
  cameras: MediaDeviceInfo[];
  selectedCamera: string;
  onCameraChange: (deviceId: string) => void;
}

/** Renders a camera dropdown for available video input devices. */
export function CameraSelector(props: CameraSelectorProps): JSX.Element {
  const { cameras, selectedCamera, onCameraChange } = props;

  /** Handles camera dropdown changes. */
  function handleChange(event: React.ChangeEvent<HTMLSelectElement>): void {
    onCameraChange(event.target.value);
  }

  return (
    <label className="block text-sm text-slate-300">
      Camera
      <select
        className="mt-2 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/40"
        value={selectedCamera}
        onChange={handleChange}
      >
        <option value="default">Default camera</option>
        {cameras.map((camera, index) => (
          <option key={camera.deviceId} value={camera.deviceId}>
            {camera.label || `Camera ${index + 1}`}
          </option>
        ))}
      </select>
    </label>
  );
}
