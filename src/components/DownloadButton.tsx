import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DownloadService } from '../services/download';
import { Track } from '../store/appStore';
import { useAppStore } from '../store/appStore';

interface DownloadButtonProps {
  track: Track;
  onDownloadComplete?: () => void;
}

export default function DownloadButton({ track, onDownloadComplete }: DownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const { currentServer } = useAppStore();

  const handleDownload = async () => {
    if (isDownloading || !currentServer) return;

    setIsDownloading(true);
    try {
      const downloadService = DownloadService.getInstance();
      await downloadService.downloadTrack(track, currentServer);
      onDownloadComplete?.();
    } catch (error) {
      console.error('Error downloading:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <TouchableOpacity
      style={styles.downloadButton}
      onPress={handleDownload}
      disabled={isDownloading}
    >
      <Ionicons 
        name={isDownloading ? 'hourglass' : 'download'} 
        size={24} 
        color={isDownloading ? '#FF9800' : '#2196F3'} 
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  downloadButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
});
