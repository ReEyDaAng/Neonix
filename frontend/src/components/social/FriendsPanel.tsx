"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, type FriendsSnapshot, type IncomingInvitation, type PublicUserMini } from "@/lib/api";

type Tab = "friends" | "pending" | "invites";

interface FriendsPanelProps {
  /** Called after a successful invitation accept so the parent can refresh rooms. */
  onInvitationAccepted?: (roomId: string) => void;
}

/**
 * Right-side social panel — friends list, pending friend requests, and
 * pending server invitations. Replaces the previous static placeholder.
 *
 * @param props onInvitationAccepted callback
 * @returns side panel element
 */
export function FriendsPanel({ onInvitationAccepted }: FriendsPanelProps) {
  const [tab, setTab] = useState<Tab>("friends");
  const [snapshot, setSnapshot] = useState<FriendsSnapshot | null>(null);
  const [invitations, setInvitations] = useState<IncomingInvitation[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PublicUserMini[]>([]);
  const [searching, setSearching] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadSnapshot = useCallback(async () => {
    try {
      const [s, i] = await Promise.all([
        api.social.listFriends(),
        api.social.listInvitations(),
      ]);
      setSnapshot(s);
      setInvitations(i);
    } catch {
      // silent — will retry on next interaction
    }
  }, []);

  // Initial load + soft polling for incoming requests/invitations.
  useEffect(() => {
    loadSnapshot();
    const id = window.setInterval(loadSnapshot, 30_000);
    return () => window.clearInterval(id);
  }, [loadSnapshot]);

  // Debounced user search.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const r = await api.social.searchUsers(trimmed);
        setSearchResults(r);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  const friendIds = useMemo(
    () => new Set(snapshot?.friends.map((f) => f.user.id) ?? []),
    [snapshot],
  );
  const outgoingIds = useMemo(
    () => new Set(snapshot?.outgoing.map((o) => o.user.id) ?? []),
    [snapshot],
  );

  async function sendRequest(target: PublicUserMini) {
    setActionError(null);
    try {
      await api.social.sendFriendRequest({ username: target.username });
      await loadSnapshot();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to send request");
    }
  }

  async function accept(friendshipId: string) {
    setActionError(null);
    try {
      await api.social.acceptFriendRequest(friendshipId);
      await loadSnapshot();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed");
    }
  }

  async function decline(friendshipId: string) {
    setActionError(null);
    try {
      await api.social.declineFriendRequest(friendshipId);
      await loadSnapshot();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed");
    }
  }

  async function remove(userId: string) {
    setActionError(null);
    try {
      await api.social.removeFriend(userId);
      await loadSnapshot();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed");
    }
  }

  async function acceptInvite(id: string) {
    setActionError(null);
    try {
      const res = await api.social.acceptInvitation(id);
      await loadSnapshot();
      onInvitationAccepted?.(res.roomId);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed");
    }
  }

  async function declineInvite(id: string) {
    setActionError(null);
    try {
      await api.social.declineInvitation(id);
      await loadSnapshot();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed");
    }
  }

  const pendingCount = (snapshot?.incoming.length ?? 0) + invitations.length;

  return (
    <aside className="panel rightCol friendsPanel" aria-label="Friends">
      <div className="phd">
        <b>Connections</b>
        {pendingCount > 0 && <span className="pill friendsPanel__badge">{pendingCount}</span>}
      </div>

      <div className="friendsPanel__tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "friends"}
          className={`friendsPanel__tab ${tab === "friends" ? "active" : ""}`}
          onClick={() => setTab("friends")}
        >
          Friends
          {snapshot?.friends.length ? (
            <span className="friendsPanel__count">{snapshot.friends.length}</span>
          ) : null}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "pending"}
          className={`friendsPanel__tab ${tab === "pending" ? "active" : ""}`}
          onClick={() => setTab("pending")}
        >
          Pending
          {snapshot?.incoming.length ? (
            <span className="friendsPanel__count attn">{snapshot.incoming.length}</span>
          ) : null}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "invites"}
          className={`friendsPanel__tab ${tab === "invites" ? "active" : ""}`}
          onClick={() => setTab("invites")}
        >
          Invites
          {invitations.length ? (
            <span className="friendsPanel__count attn">{invitations.length}</span>
          ) : null}
        </button>
      </div>

      <div className="friendsPanel__body">
        {tab === "friends" && (
          <>
            <div className="friendsPanel__search">
              <input
                className="input"
                placeholder="Find user by name, @username or email"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search users"
              />
            </div>

            {actionError && <div className="hint" role="alert" style={{ color: "#ff7676" }}>{actionError}</div>}

            {searchQuery.trim().length >= 2 && (
              <div className="friendsPanel__section">
                <div className="muted" style={{ fontSize: 11, marginBottom: 4 }}>
                  Search results {searching ? "…" : ""}
                </div>
                {searchResults.length === 0 && !searching && (
                  <div className="muted">No matches</div>
                )}
                {searchResults.map((u) => {
                  const alreadyFriend = friendIds.has(u.id);
                  const alreadySent = outgoingIds.has(u.id);
                  return (
                    <div className="friendsPanel__row" key={u.id}>
                      <div className="friendsPanel__avatar">
                        {u.displayName.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="friendsPanel__info">
                        <b>{u.displayName}</b>
                        <span className="muted">{u.username}</span>
                      </div>
                      <button
                        type="button"
                        className="btn primary"
                        disabled={alreadyFriend || alreadySent}
                        onClick={() => sendRequest(u)}
                      >
                        {alreadyFriend ? "Friend" : alreadySent ? "Sent" : "+ Add"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="friendsPanel__section">
              <div className="muted" style={{ fontSize: 11, marginBottom: 4 }}>
                Your friends
              </div>
              {snapshot?.friends.length === 0 && (
                <div className="muted">No friends yet — search above to add some.</div>
              )}
              {snapshot?.friends.map((f) => (
                <div className="friendsPanel__row" key={f.friendshipId}>
                  <div className="friendsPanel__avatar online">
                    {f.user.displayName.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="friendsPanel__info">
                    <b>{f.user.displayName}</b>
                    <span className="muted">{f.user.username}</span>
                  </div>
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => remove(f.user.id)}
                    title="Remove friend"
                    aria-label={`Remove ${f.user.displayName}`}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "pending" && (
          <>
            {actionError && <div className="hint" role="alert" style={{ color: "#ff7676" }}>{actionError}</div>}
            <div className="friendsPanel__section">
              <div className="muted" style={{ fontSize: 11, marginBottom: 4 }}>Incoming</div>
              {snapshot?.incoming.length === 0 && (
                <div className="muted">No pending requests.</div>
              )}
              {snapshot?.incoming.map((p) => (
                <div className="friendsPanel__row" key={p.friendshipId}>
                  <div className="friendsPanel__avatar">
                    {p.user.displayName.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="friendsPanel__info">
                    <b>{p.user.displayName}</b>
                    <span className="muted">{p.user.username}</span>
                  </div>
                  <div className="friendsPanel__actions">
                    <button type="button" className="btn primary" onClick={() => accept(p.friendshipId)}>Accept</button>
                    <button type="button" className="btn ghost" onClick={() => decline(p.friendshipId)}>Decline</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="friendsPanel__section">
              <div className="muted" style={{ fontSize: 11, marginBottom: 4 }}>Sent</div>
              {snapshot?.outgoing.length === 0 && <div className="muted">No outgoing requests.</div>}
              {snapshot?.outgoing.map((p) => (
                <div className="friendsPanel__row" key={p.friendshipId}>
                  <div className="friendsPanel__avatar">
                    {p.user.displayName.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="friendsPanel__info">
                    <b>{p.user.displayName}</b>
                    <span className="muted">{p.user.username}</span>
                  </div>
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => decline(p.friendshipId)}
                    title="Cancel request"
                  >
                    Cancel
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "invites" && (
          <>
            {actionError && <div className="hint" role="alert" style={{ color: "#ff7676" }}>{actionError}</div>}
            <div className="friendsPanel__section">
              {invitations.length === 0 && (
                <div className="muted">No pending server invitations.</div>
              )}
              {invitations.map((inv) => (
                <div className="friendsPanel__row" key={inv.id}>
                  <div className="friendsPanel__avatar squared">{inv.room.badge}</div>
                  <div className="friendsPanel__info">
                    <b>{inv.room.name}</b>
                    <span className="muted">from {inv.inviter.displayName}</span>
                  </div>
                  <div className="friendsPanel__actions">
                    <button type="button" className="btn primary" onClick={() => acceptInvite(inv.id)}>Accept</button>
                    <button type="button" className="btn ghost" onClick={() => declineInvite(inv.id)}>Decline</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
