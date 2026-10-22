// react-native-maps doesn't run in a browser. On the web, TrackCaregiverScreen
// shows its "Open in Google Maps" fallback instead, so these are never drawn.
import React from 'react';
import { View } from 'react-native';

const MapView = React.forwardRef((props, ref) => <View ref={ref} {...props} />);
export default MapView;
export const Marker = () => null;
export const PROVIDER_GOOGLE = 'google';
