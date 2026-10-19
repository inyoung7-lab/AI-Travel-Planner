import test from 'node:test';
import assert from 'node:assert/strict';
import { isGeneratedExperienceImage, resolveExperienceImageUrl } from './experienceImageSource.js';

const storageClient = {
  storage: {
    from(bucket) {
      assert.equal(bucket, 'local-eum-media');
      return { getPublicUrl(path) { return { data: { publicUrl: `https://demo.supabase.co/storage/v1/object/public/${bucket}/${path}` } }; } };
    },
  },
};

test('resolves the expected Storage object path to a public URL', () => {
  assert.equal(
    resolveExperienceImageUrl('experiences/102/cover.webp', storageClient),
    'https://demo.supabase.co/storage/v1/object/public/local-eum-media/experiences/102/cover.webp',
  );
  assert.equal(
    resolveExperienceImageUrl('experiences/111/cover-v2.webp', storageClient),
    'https://demo.supabase.co/storage/v1/object/public/local-eum-media/experiences/111/cover-v2.webp',
  );
});

test('preserves HTTPS URLs and supported local image paths', () => {
  assert.equal(resolveExperienceImageUrl('https://images.example.test/cover.webp', storageClient), 'https://images.example.test/cover.webp');
  assert.equal(resolveExperienceImageUrl('/images/local-eum/market.webp', storageClient), '/images/local-eum/market.webp');
});

test('rejects unsafe or unknown Storage paths and handles a missing client', () => {
  assert.equal(resolveExperienceImageUrl('../secret.webp', storageClient), null);
  assert.equal(resolveExperienceImageUrl('experiences/102/other.webp', storageClient), null);
  assert.equal(resolveExperienceImageUrl('/images/local-eum/../secret.webp', storageClient), null);
  assert.equal(resolveExperienceImageUrl('experiences/102/cover.webp', null), null);
  assert.equal(resolveExperienceImageUrl(null, storageClient), null);
});

test('marks Storage and local generated covers as AI demo imagery', () => {
  assert.equal(isGeneratedExperienceImage('experiences/102/cover.webp'), true);
  assert.equal(isGeneratedExperienceImage('experiences/111/cover-v2.webp'), true);
  assert.equal(isGeneratedExperienceImage('https://demo.supabase.co/storage/v1/object/public/local-eum-media/experiences/102/cover.webp'), true);
  assert.equal(isGeneratedExperienceImage('https://demo.supabase.co/storage/v1/object/public/local-eum-media/experiences/111/cover-v2.webp'), true);
  assert.equal(isGeneratedExperienceImage('/images/local-eum/experiences/102/cover.webp'), true);
  assert.equal(isGeneratedExperienceImage('https://images.example.test/real-photo.webp'), false);
});
