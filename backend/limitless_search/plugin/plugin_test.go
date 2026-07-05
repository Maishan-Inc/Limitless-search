package plugin

import (
	"testing"
	"time"

	"pansou/model"
)

func TestUpdateMainCacheWithFinalDeduplicatesStringUniqueIDs(t *testing.T) {
	plugin := &BaseAsyncPlugin{
		name:               "test-plugin",
		cacheTTL:           time.Minute,
		currentKeyword:     "naruto",
		finalUpdateTracker: make(map[string]bool),
	}

	calls := 0
	var capturedKey string
	var capturedResults []model.SearchResult
	var capturedTTL time.Duration
	var capturedIsFinal bool
	var capturedKeyword string

	plugin.SetMainCacheUpdater(func(key string, results []model.SearchResult, ttl time.Duration, isFinal bool, keyword string) error {
		calls++
		capturedKey = key
		capturedResults = results
		capturedTTL = ttl
		capturedIsFinal = isFinal
		capturedKeyword = keyword
		return nil
	})

	results := []model.SearchResult{
		{UniqueID: "tg:anime:1001", Title: "Naruto"},
		{UniqueID: "plugin:source:2002", Title: "Naruto Shippuden"},
	}

	plugin.updateMainCacheWithFinal("search:naruto", results, true)
	plugin.updateMainCacheWithFinal("search:naruto", results, true)

	if calls != 1 {
		t.Fatalf("expected duplicate final cache update to be skipped, got %d calls", calls)
	}
	if capturedKey != "search:naruto" {
		t.Fatalf("expected cache key search:naruto, got %q", capturedKey)
	}
	if len(capturedResults) != len(results) {
		t.Fatalf("expected %d results, got %d", len(results), len(capturedResults))
	}
	if capturedTTL != time.Minute {
		t.Fatalf("expected ttl %s, got %s", time.Minute, capturedTTL)
	}
	if !capturedIsFinal {
		t.Fatal("expected final cache update")
	}
	if capturedKeyword != "naruto" {
		t.Fatalf("expected keyword naruto, got %q", capturedKeyword)
	}
}

func TestUpdateMainCacheWithFinalSkipsInvalidInputs(t *testing.T) {
	plugin := &BaseAsyncPlugin{
		name:               "test-plugin",
		cacheTTL:           time.Minute,
		finalUpdateTracker: make(map[string]bool),
	}

	calls := 0
	plugin.SetMainCacheUpdater(func(string, []model.SearchResult, time.Duration, bool, string) error {
		calls++
		return nil
	})

	plugin.updateMainCacheWithFinal("", []model.SearchResult{{UniqueID: "one"}}, true)
	plugin.updateMainCacheWithFinal("search:empty", nil, true)

	if calls != 0 {
		t.Fatalf("expected invalid cache updates to be skipped, got %d calls", calls)
	}
}
