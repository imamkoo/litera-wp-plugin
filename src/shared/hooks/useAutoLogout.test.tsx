import React from 'react';
import { act, render } from '@testing-library/react';
import { useAutoLogout } from './useAutoLogout';

const ExpireProbe = ({
  isAuthenticated,
  onExpire,
}: {
  isAuthenticated: boolean;
  onExpire: () => void;
}) => {
  useAutoLogout({
    isAuthenticated,
    identity: '0xabc',
    ttlMs: 10_000,
    onExpire,
  });
  return null;
};

describe('useAutoLogout', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('memanggil onExpire tepat setelah TTL habis', () => {
    const onExpire = jest.fn();

    render(<ExpireProbe isAuthenticated onExpire={onExpire} />);

    act(() => {
      jest.advanceTimersByTime(9_999);
    });
    expect(onExpire).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it('tidak menjadwalkan logout saat belum terautentikasi', () => {
    const onExpire = jest.fn();

    render(<ExpireProbe isAuthenticated={false} onExpire={onExpire} />);

    act(() => {
      jest.advanceTimersByTime(20_000);
    });

    expect(onExpire).not.toHaveBeenCalled();
  });
});
