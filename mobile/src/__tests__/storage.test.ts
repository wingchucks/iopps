import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';

// Import the module to test - we need to mock fetch first
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock blob response
const mockBlob = new Blob(['test content'], { type: 'application/pdf' });
mockFetch.mockResolvedValue({
  blob: () => Promise.resolve(mockBlob),
});

// Now import the storage functions
import {
  uploadProfilePhoto,
  uploadResume,
  deleteFile,
  getFileURL,
} from '../lib/storage';

describe('Storage utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockResolvedValue({
      blob: () => Promise.resolve(mockBlob),
    });
  });

  describe('uploadProfilePhoto', () => {
    it('should upload profile photo and return download URL', async () => {
      const userId = 'test-user-123';
      const localUri = 'file:///path/to/photo.jpg';

      const result = await uploadProfilePhoto(userId, localUri);

      expect(result).toEqual({
        downloadURL: 'https://example.com/file.jpg',
        path: expect.stringContaining(`users/${userId}/profile`),
      });
    });

    it('should call ref with correct path', async () => {
      const userId = 'test-user-123';
      const localUri = 'file:///path/to/photo.png';

      await uploadProfilePhoto(userId, localUri);

      expect(ref).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining(`users/${userId}/profile.png`)
      );
    });

    it('should call uploadBytesResumable', async () => {
      const userId = 'test-user-123';
      const localUri = 'file:///path/to/photo.jpg';

      await uploadProfilePhoto(userId, localUri);

      expect(uploadBytesResumable).toHaveBeenCalled();
    });

    it('should call onProgress callback during upload', async () => {
      const onProgress = jest.fn();
      const userId = 'test-user-123';
      const localUri = 'file:///path/to/photo.jpg';

      // Update mock to trigger progress
      (uploadBytesResumable as jest.Mock).mockImplementationOnce(() => ({
        on: jest.fn((event, onProgressCb, onError, onComplete) => {
          onProgressCb({ bytesTransferred: 50, totalBytes: 100 });
          setTimeout(() => onComplete(), 10);
        }),
        snapshot: { ref: {} },
      }));

      await uploadProfilePhoto(userId, localUri, onProgress);

      expect(onProgress).toHaveBeenCalledWith({
        bytesTransferred: 50,
        totalBytes: 100,
        progress: 50,
      });
    });

    it('should handle URIs without extension by using default jpg', async () => {
      const userId = 'test-user-123';
      const localUri = 'file:///path/to/photo.jpg';

      await uploadProfilePhoto(userId, localUri);

      expect(ref).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('profile.jpg')
      );
    });
  });

  describe('uploadResume', () => {
    it('should upload resume and return download URL', async () => {
      const userId = 'test-user-123';
      const localUri = 'file:///path/to/resume.pdf';
      const fileName = 'My Resume.pdf';

      const result = await uploadResume(userId, localUri, fileName);

      expect(result).toEqual({
        downloadURL: 'https://example.com/file.jpg',
        path: expect.stringContaining(`users/${userId}/resumes/`),
      });
    });

    it('should sanitize filename', async () => {
      const userId = 'test-user-123';
      const localUri = 'file:///path/to/resume.pdf';
      const fileName = 'My Resume (2024).pdf';

      await uploadResume(userId, localUri, fileName);

      // Filename should have special characters replaced
      expect(ref).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('My_Resume__2024_.pdf')
      );
    });

    it('should include timestamp in path', async () => {
      const userId = 'test-user-123';
      const localUri = 'file:///path/to/resume.pdf';
      const fileName = 'resume.pdf';

      const beforeTime = Date.now();
      await uploadResume(userId, localUri, fileName);
      const afterTime = Date.now();

      const call = (ref as jest.Mock).mock.calls[0];
      const path = call[1];
      const timestampMatch = path.match(/\/(\d+)_/);

      expect(timestampMatch).toBeTruthy();
      const timestamp = parseInt(timestampMatch[1], 10);
      expect(timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(timestamp).toBeLessThanOrEqual(afterTime);
    });

    it('should call onProgress callback during upload', async () => {
      const onProgress = jest.fn();
      const userId = 'test-user-123';
      const localUri = 'file:///path/to/resume.pdf';
      const fileName = 'resume.pdf';

      // Update mock to trigger progress
      (uploadBytesResumable as jest.Mock).mockImplementationOnce(() => ({
        on: jest.fn((event, onProgressCb, onError, onComplete) => {
          onProgressCb({ bytesTransferred: 75, totalBytes: 100 });
          setTimeout(() => onComplete(), 10);
        }),
        snapshot: { ref: {} },
      }));

      await uploadResume(userId, localUri, fileName, onProgress);

      expect(onProgress).toHaveBeenCalledWith({
        bytesTransferred: 75,
        totalBytes: 100,
        progress: 75,
      });
    });
  });

  describe('deleteFile', () => {
    it('should delete file at given path', async () => {
      const path = 'users/test-user/profile.jpg';

      await deleteFile(path);

      expect(ref).toHaveBeenCalledWith(expect.anything(), path);
      expect(deleteObject).toHaveBeenCalled();
    });
  });

  describe('getFileURL', () => {
    it('should return download URL for given path', async () => {
      const path = 'users/test-user/profile.jpg';

      const url = await getFileURL(path);

      expect(ref).toHaveBeenCalledWith(expect.anything(), path);
      expect(getDownloadURL).toHaveBeenCalled();
      expect(url).toBe('https://example.com/file.jpg');
    });
  });
});
