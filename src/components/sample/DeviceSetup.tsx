// import { PrimaryButton, Stack } from '@fluentui/react';

// export const DeviceSetup = (props: {
//   /** Callback to let the parent component know what the chosen user device settings were */
//   onDeviceSetupComplete: (userChosenDeviceState: { cameraOn: boolean; microphoneOn: boolean }) => void
// }): JSX.Element => {
//   return (
//     <Stack tokens={{ childrenGap: '1rem' }} verticalAlign="center" verticalFill>
//       <PrimaryButton text="Continue" onClick={() => props.onDeviceSetupComplete({ cameraOn: false, microphoneOn: false })} />
//     </Stack>
//   );
// }

import { DeviceAccess } from "@azure/communication-calling";
import { StatefulCallClient } from "@azure/communication-react";

export const checkDevicePermissionsState = async (): Promise<{camera: PermissionState, microphone: PermissionState} | 'unknown'> => {
  try {
    const [micPermissions, cameraPermissions] = await Promise.all([
      navigator.permissions.query({ name: "microphone" as PermissionName }),
      navigator.permissions.query({ name: "camera" as PermissionName })
    ]);
    console.info('PermissionAPI results', [micPermissions, cameraPermissions]); // view console logs in the browser to see what the PermissionsAPI info is returned
    return { camera: cameraPermissions.state, microphone: micPermissions.state };
  } catch (e) {
    console.warn("Permissions API unsupported", e);
    return 'unknown';
  }
}

/** Use the DeviceManager to request for permissions to access the camera and microphone. */
export const requestCameraAndMicrophonePermissions = async (callClient: StatefulCallClient): Promise<DeviceAccess> => {
  const response = await (await callClient.getDeviceManager()).askDevicePermission({ audio: true, video: true });
  console.info('AskDevicePermission response', response); // view console logs in the browser to see what device access info is returned
  return response
}