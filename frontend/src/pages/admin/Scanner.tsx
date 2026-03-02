import { useState, useEffect, useRef } from 'react';
import {
    Box,
    Typography,
    Container,
    Button,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Alert,
    CircularProgress,
    Paper
} from '@mui/material';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { BrowserQRCodeReader, IScannerControls } from '@zxing/browser';
import { adminApi, registrationsApi } from '../../services/api';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuthStore } from '../../store';
import { Navigate } from 'react-router-dom';

export default function Scanner() {
    const { user } = useAuthStore();
    const [selectedEventId, setSelectedEventId] = useState<string>('');
    const [isScanning, setIsScanning] = useState(false);
    const [scanResult, setScanResult] = useState<{ success: boolean, message: string } | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const codeReaderRef = useRef<BrowserQRCodeReader | null>(null);
    const controlsRef = useRef<IScannerControls | null>(null); // To store decoding controls
    const hasScannedRef = useRef<boolean>(false); // Prevent multiple scan fires

    // Restrict access
    if (user?.role !== 'super_admin' && user?.role !== 'organizer') {
        return <Navigate to="/dashboard" replace />;
    }

    // Fetch active events to select which event we are scanning for
    const { data: events, isLoading: isLoadingEvents } = useQuery({
        queryKey: ['admin-events'],
        queryFn: () => adminApi.listAllEvents({ status: 'published' }),
    });

    // Check in mutation
    const checkInMutation = useMutation({
        mutationFn: ({ eventId, qrCode }: { eventId: string, qrCode: string }) =>
            registrationsApi.checkIn(eventId, qrCode),
        onSuccess: (data: any) => {
            setScanResult({ success: true, message: data.message || 'Successfully checked in!' });
            // Clear success message after 3 seconds
            setTimeout(() => setScanResult(null), 3000);
        },
        onError: (error: any) => {
            setScanResult({ success: false, message: error.message || 'Check-in failed. Invalid QR or already checked in.' });
            // Let error persist longer so they can read it
            setTimeout(() => setScanResult(null), 5000);
        }
    });

    // Clean up on unmount or when scanning stops
    useEffect(() => {
        return () => {
            if (controlsRef.current) {
                controlsRef.current.stop();
            }
        };
    }, []);

    const handleStartScan = async () => {
        if (!selectedEventId) {
            setScanResult({ success: false, message: 'Please select an event first.' });
            return;
        }

        try {
            setIsScanning(true);
            setScanResult(null);

            const codeReader = new BrowserQRCodeReader();
            codeReaderRef.current = codeReader;

            const videoInputDevices = await BrowserQRCodeReader.listVideoInputDevices();

            // Try to find a back camera
            const backCamera = videoInputDevices.find(device =>
                device.label.toLowerCase().includes('back') ||
                device.label.toLowerCase().includes('environment')
            );

            const deviceId = backCamera ? backCamera.deviceId : videoInputDevices[0]?.deviceId;

            if (!deviceId) {
                throw new Error("No camera devices found");
            }

            if (!videoRef.current) {
                throw new Error("Video element not initialized");
            }

            hasScannedRef.current = false;

            const controls = await codeReader.decodeFromVideoDevice(deviceId, videoRef.current, (result, error) => {
                if (result && !checkInMutation.isPending && !hasScannedRef.current) {
                    hasScannedRef.current = true;
                    // Successfully scanned a code!
                    const scannedText = result.getText();
                    // Pause scanning while we process
                    controlsRef.current?.stop();
                    setIsScanning(false);

                    // Send to API
                    checkInMutation.mutate({ eventId: selectedEventId, qrCode: scannedText });
                }
                if (error && error.name !== 'NotFoundException') {
                    console.error(error);
                }
            });

            controlsRef.current = controls;

        } catch (err: any) {
            console.error(err);
            setIsScanning(false);
            setScanResult({ success: false, message: 'Failed to access camera: ' + err.message });
        }
    };

    const handleStopScan = () => {
        if (controlsRef.current) {
            controlsRef.current.stop();
            controlsRef.current = null;
        }
        setIsScanning(false);
    };

    return (
        <Container maxWidth="sm" sx={{ py: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Typography variant="h4" component="h1" gutterBottom fontWeight="bold" textAlign="center">
                Mobile Check-In
            </Typography>
            <Typography variant="body1" color="text.secondary" textAlign="center" mb={4}>
                Scan attendee QR codes to instantly check them into the event.
            </Typography>

            <Paper elevation={3} sx={{ p: 4, width: '100%', borderRadius: 2 }}>

                {/* Event Selector */}
                <FormControl fullWidth sx={{ mb: 4 }}>
                    <InputLabel id="event-select-label">Select Event</InputLabel>
                    <Select
                        labelId="event-select-label"
                        value={selectedEventId}
                        label="Select Event"
                        onChange={(e) => setSelectedEventId(e.target.value)}
                        disabled={isScanning || isLoadingEvents}
                    >
                        {isLoadingEvents ? (
                            <MenuItem value="" disabled><CircularProgress size={20} sx={{ mr: 2 }} /> Loading events...</MenuItem>
                        ) : (
                            events?.map(event => (
                                <MenuItem key={event.id} value={event.id}>{event.name}</MenuItem>
                            ))
                        )}
                    </Select>
                </FormControl>

                {/* Camera View Area */}
                <Box
                    sx={{
                        width: '100%',
                        aspectRatio: '1',
                        bgcolor: 'black',
                        borderRadius: 2,
                        overflow: 'hidden',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        mb: 3,
                        position: 'relative'
                    }}
                >
                    <video
                        ref={videoRef}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            display: isScanning ? 'block' : 'none'
                        }}
                    />

                    {!isScanning && (
                        <QrCodeScannerIcon sx={{ fontSize: 80, color: 'rgba(255,255,255,0.3)' }} />
                    )}

                    {checkInMutation.isPending && (
                        <Box sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
                            <CircularProgress color="primary" />
                            <Typography color="white" mt={2}>Verifying Ticket...</Typography>
                        </Box>
                    )}
                </Box>

                {/* Controls */}
                <Button
                    variant="contained"
                    color={isScanning ? "error" : "primary"}
                    fullWidth
                    size="large"
                    startIcon={isScanning ? undefined : <QrCodeScannerIcon />}
                    onClick={isScanning ? handleStopScan : handleStartScan}
                    disabled={!selectedEventId || checkInMutation.isPending}
                >
                    {isScanning ? "Stop Scanning" : "Start Scanner"}
                </Button>

            </Paper>

            {/* Result Alerts */}
            {scanResult && (
                <Alert
                    variant="filled"
                    severity={scanResult.success ? "success" : "error"}
                    icon={scanResult.success ? <CheckCircleIcon fontSize="inherit" /> : undefined}
                    sx={{ mt: 3, width: '100%', borderRadius: 2 }}
                >
                    {scanResult.message}
                </Alert>
            )}

        </Container>
    );
}
