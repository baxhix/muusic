import { describe, expect, it } from 'vitest';
import {
  parseAccountSettingsInput,
  parseChangePasswordInput,
  parseLoginInput,
  parseRegisterInput,
  parseTrendingPlaybackInput
} from '../utils/routeSchemas.js';

describe('route schemas', () => {
  it('validates register payload', () => {
    expect(parseRegisterInput({ name: '', email: '', password: '', confirmPassword: '' }).error).toBeTruthy();
    expect(
      parseRegisterInput({
        name: 'Marcelo',
        email: 'marcelo@muusic.live',
        password: '123456',
        confirmPassword: '123456'
      })
    ).toEqual({
      name: 'Marcelo',
      email: 'marcelo@muusic.live',
      password: '123456'
    });
  });

  it('validates login payload', () => {
    expect(parseLoginInput({ email: 'x', password: '' }).error).toBeTruthy();
    expect(parseLoginInput({ email: 'admin@muusic.live', password: '123456' })).toEqual({
      email: 'admin@muusic.live',
      password: '123456'
    });
  });

  it('validates change-password payload', () => {
    expect(
      parseChangePasswordInput({
        currentPassword: '123456',
        newPassword: '123456',
        confirmPassword: '123456'
      }).error
    ).toBeTruthy();
    expect(
      parseChangePasswordInput({
        currentPassword: '123456',
        newPassword: '12345678',
        confirmPassword: '12345678'
      })
    ).toEqual({
      currentPassword: '123456',
      newPassword: '12345678'
    });
  });

  it('validates account settings payload', () => {
    expect(parseAccountSettingsInput({ city: 'A' }).error).toBeTruthy();
    expect(
      parseAccountSettingsInput({
        city: 'Londrina',
        bio: 'Bio',
        locationEnabled: true,
        showMusicHistory: false
      })
    ).toMatchObject({
      city: 'Londrina',
      bio: 'Bio',
      locationEnabled: true,
      showMusicHistory: false
    });
  });

  it('validates trending payload', () => {
    expect(parseTrendingPlaybackInput({ isPlaying: false })).toEqual({ isPlaying: false });
    expect(parseTrendingPlaybackInput({ isPlaying: true, artistName: '', trackName: '' }).error).toBeTruthy();
    expect(
      parseTrendingPlaybackInput({
        isPlaying: true,
        artistId: 'a1',
        artistName: 'Artist',
        trackId: 't1',
        trackName: 'Track'
      })
    ).toMatchObject({
      isPlaying: true,
      artistId: 'a1',
      artistName: 'Artist',
      trackId: 't1',
      trackName: 'Track'
    });
  });
});
