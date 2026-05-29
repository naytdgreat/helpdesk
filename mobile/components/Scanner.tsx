import React, { useState, useEffect } from 'react';
import { Text, View, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { RefreshCw } from 'lucide-react-native';

export default function Scanner({ onScan }: { onScan: (data: string) => void }) {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);

    if (!permission) {
        // Camera permissions are still loading
        return <View style={styles.center}><Text>Loading permissions...</Text></View>;
    }

    if (!permission.granted) {
        // Camera permissions are not granted yet
        return (
            <View style={styles.center}>
                <Text style={{ textAlign: 'center', marginBottom: 10 }}>We need your permission to show the camera</Text>
                <TouchableOpacity
                    onPress={requestPermission}
                    style={{ backgroundColor: '#3b82f6', padding: 15, borderRadius: 10 }}
                >
                    <Text style={{ color: 'white', fontWeight: 'bold' }}>Grant Permission</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const handleBarCodeScanned = ({ data }: { type: string; data: string }) => {
        if (scanned) return;
        setScanned(true);
        onScan(data);
    };

    return (
        <View style={styles.container}>
            <CameraView
                style={StyleSheet.absoluteFillObject}
                facing="back"
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                barcodeScannerSettings={{
                    barcodeTypes: ["qr", "ean13", "code128"],
                }}
            />

            {/* HUD / Overlay */}
            <View style={styles.overlay}>
                {/* Top Mask */}
                <View style={[styles.maskBase, { flex: 1, width: '100%' }]} />

                <View style={{ flexDirection: 'row', height: scannerHeight }}>
                    {/* Left Mask */}
                    <View style={[styles.maskBase, { flex: 1 }]} />

                    {/* Focused Area */}
                    <View style={styles.focusedContainer}>
                        <View style={styles.cornerTopLeft} />
                        <View style={styles.cornerTopRight} />
                        <View style={styles.cornerBottomLeft} />
                        <View style={styles.cornerBottomRight} />
                        <View style={styles.scanLine} />
                    </View>

                    {/* Right Mask */}
                    <View style={[styles.maskBase, { flex: 1 }]} />
                </View>

                {/* Bottom Mask */}
                <View style={[styles.maskBase, { flex: 1, width: '100%' }]} />
            </View>

            <View style={styles.bottomBar}>
                <Text style={styles.instructionText}>
                    Align barcode within the rectangle to scan
                </Text>

                {scanned && (
                    <TouchableOpacity
                        style={styles.rescanButton}
                        onPress={() => setScanned(false)}
                    >
                        <RefreshCw color="white" size={20} />
                        <Text style={styles.rescanText}>Tap to Scan Again</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const { width } = Dimensions.get('window');
const scannerWidth = width * 0.85;
const scannerHeight = width * 0.45;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'column',
        justifyContent: 'center',
        backgroundColor: 'black'
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
    },
    maskBase: {
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    focusedContainer: {
        width: scannerWidth,
        height: scannerHeight,
        borderWidth: 0,
        position: 'relative',
    },
    scanLine: {
        position: 'absolute',
        top: scannerHeight / 2,
        left: 10,
        right: 10,
        height: 1,
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        shadowColor: '#3b82f6',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 2,
        elevation: 2
    },
    cornerTopLeft: { position: 'absolute', top: 0, left: 0, width: 40, height: 40, borderTopWidth: 4, borderLeftWidth: 4, borderColor: '#3b82f6', borderTopLeftRadius: 15 },
    cornerTopRight: { position: 'absolute', top: 0, right: 0, width: 40, height: 40, borderTopWidth: 4, borderRightWidth: 4, borderColor: '#3b82f6', borderTopRightRadius: 15 },
    cornerBottomLeft: { position: 'absolute', bottom: 0, left: 0, width: 40, height: 40, borderBottomWidth: 4, borderLeftWidth: 4, borderColor: '#3b82f6', borderBottomLeftRadius: 15 },
    cornerBottomRight: { position: 'absolute', bottom: 0, right: 0, width: 40, height: 40, borderBottomWidth: 4, borderRightWidth: 4, borderColor: '#3b82f6', borderBottomRightRadius: 15 },

    bottomBar: {
        position: 'absolute',
        bottom: 40,
        left: 0,
        right: 0,
        alignItems: 'center',
        paddingHorizontal: 20
    },
    instructionText: {
        color: 'white',
        fontSize: 16,
        textAlign: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        overflow: 'hidden'
    },
    rescanButton: {
        marginTop: 20,
        backgroundColor: '#3b82f6',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 25,
        paddingVertical: 15,
        borderRadius: 30,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 8,
    },
    rescanText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16
    }
});
