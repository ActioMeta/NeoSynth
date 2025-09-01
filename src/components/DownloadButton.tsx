import React, { useState, useEffect } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DownloadService } from '../services/download';
import { isTrackOffline } from '../database/offlineTracks';
import { Track } from '../store/appStore';
import { useAppStore } from '../store/appStore';

interface DownloadButtonProps {
  track: Track;
  onDownloadComplete?: () => void;
}

export default function DownloadButton({ track, onDownloadComplete }: DownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const { currentServer } = useAppStore();

  useEffect(() => {
    // Verificar si la canción ya está descargada consultando la base de datos
    const checkDownloadStatus = async () => {
      if (!currentServer || !track.id) return;
      
      try {
        const isOffline = await isTrackOffline(track.id);
        console.log(`🔍 Checking download status for ${track.title}: ${isOffline}`);
        setIsDownloaded(isOffline);
      } catch (error) {
        console.log('Error checking download status:', error);
        setIsDownloaded(false);
      }
    };

    checkDownloadStatus();
  }, [track.id, currentServer]);

  const handleDownload = async () => {
    if (isDownloading || !currentServer || isDownloaded) return;

    setIsDownloading(true);
    try {
      const downloadService = DownloadService.getInstance();
      await downloadService.downloadTrack(track, currentServer);
      setIsDownloaded(true);
      onDownloadComplete?.();
    } catch (error) {
      console.error('Error downloading:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  // Determinar el icono y color
  let iconName: string;
  let iconColor: string;

  if (isDownloaded) {
    iconName = 'check-circle';
    iconColor = '#4CAF50'; // Verde para descargado
  } else if (isDownloading) {
    iconName = 'download-cloud';
    iconColor = '#FF9800'; // Naranja para descargando
  } else {
    iconName = 'download';
    iconColor = '#5752D7'; // Morado para disponible para descarga
  }

  return (
    <TouchableOpacity
      style={[
        styles.downloadButton,
        isDownloaded && styles.downloadedButton
      ]}
      onPress={handleDownload}
      disabled={isDownloading || isDownloaded}
    >
      <Feather 
        name={iconName as any} 
        size={20} 
        color={iconColor} 
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  downloadButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(87, 82, 215, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(87, 82, 215, 0.3)',
  },
  downloadedButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
});
