<script>
	import { candidates } from '@sudoku/stores/candidates';
	import { userGrid } from '@sudoku/stores/grid';
	import { cursor } from '@sudoku/stores/cursor';
	import { hints } from '@sudoku/stores/hints';
	import { notes } from '@sudoku/stores/notes';
	import { settings } from '@sudoku/stores/settings';
	import { keyboardDisabled } from '@sudoku/stores/keyboard';
	import { gamePaused } from '@sudoku/stores/game';
<<<<<<< HEAD
	import { modal } from '@sudoku/stores/modal';
	import { clearExploreFailure, exploreActive, exploreFailure } from '@sudoku/stores/explore';
	import { undoGame, redoGame, canUndoGame, canRedoGame, startExplore, commitExplore, cancelExplore, backtrackExplore } from '@sudoku/game';

	$: hintsAvailable = $hints > 0;
	let showingExploreFailure = false;

	$: if ($exploreFailure && !showingExploreFailure) {
		showingExploreFailure = true;
		const reasonText = $exploreFailure.reason === 'repeat'
			? 'This board matches a previously failed exploration path.'
			: 'This move creates a conflict in the board.';
		modal.show('confirm', {
			title: 'Explore failed',
			text: reasonText,
			button: 'OK',
			onHide: () => {
				clearExploreFailure();
				showingExploreFailure = false;
			}
		});
	}

	function handleHint() {
		if (!hintsAvailable) return;
		if ($userGrid[$cursor.y][$cursor.x] !== 0) return;

		if ($notes) {
			const candidateHint = userGrid.getCandidateHint($cursor);
			if (candidateHint && candidateHint.length > 0) {
				candidates.setCandidates($cursor, candidateHint);
			} else {
				modal.show('confirm', {
					title: 'No candidates',
					text: 'No valid candidates are available for this cell.',
					button: 'OK'
				});
			}
			return;
		}

		if ($candidates.hasOwnProperty($cursor.x + ',' + $cursor.y)) {
			candidates.clear($cursor);
		}

		const hint = userGrid.applyNextHint();
		if (hint) {
			cursor.set(hint.col, hint.row);
		} else {
			modal.show('confirm', {
				title: 'No next step',
				text: 'No single-candidate move is available right now.',
				button: 'OK'
			});
		}
	}

	function handleExploreStart() {
		startExplore();
	}

	function handleExploreCommit() {
		commitExplore();
	}

	function handleExploreCancel() {
		cancelExplore();
	}

	function handleExploreBacktrack() {
		backtrackExplore();
=======

	$: hintsAvailable = $hints > 0;

	function handleHint() {
		if (hintsAvailable) {
			if ($candidates.hasOwnProperty($cursor.x + ',' + $cursor.y)) {
				candidates.clear($cursor);
			}

			userGrid.applyHint($cursor);
		}
>>>>>>> c96b12047cad8a4bb8b633fed05f9def1bbb71b6
	}
</script>

<div class="action-buttons space-x-3">

<<<<<<< HEAD
	<button class="btn btn-round" disabled={$gamePaused || !canUndoGame()} on:click={undoGame} title="Undo">
=======
	<button class="btn btn-round" disabled={$gamePaused} title="Undo">
>>>>>>> c96b12047cad8a4bb8b633fed05f9def1bbb71b6
		<svg class="icon-outline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
		</svg>
	</button>

<<<<<<< HEAD
	<button class="btn btn-round" disabled={$gamePaused || !canRedoGame()} on:click={redoGame} title="Redo">
=======
	<button class="btn btn-round" disabled={$gamePaused} title="Redo">
>>>>>>> c96b12047cad8a4bb8b633fed05f9def1bbb71b6
		<svg class="icon-outline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 10h-10a8 8 90 00-8 8v2M21 10l-6 6m6-6l-6-6" />
		</svg>
	</button>

	<button class="btn btn-round btn-badge" disabled={$keyboardDisabled || !hintsAvailable || $userGrid[$cursor.y][$cursor.x] !== 0} on:click={handleHint} title="Hints ({$hints})">
		<svg class="icon-outline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
		</svg>

		{#if $settings.hintsLimited}
			<span class="badge" class:badge-primary={hintsAvailable}>{$hints}</span>
		{/if}
	</button>

	<button class="btn btn-round btn-badge" on:click={notes.toggle} title="Notes ({$notes ? 'ON' : 'OFF'})">
		<svg class="icon-outline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
		</svg>

		<span class="badge tracking-tighter" class:badge-primary={$notes}>{$notes ? 'ON' : 'OFF'}</span>
	</button>

<<<<<<< HEAD
	{#if $exploreActive}
		<button class="btn btn-small" disabled={$gamePaused} on:click={handleExploreBacktrack} title="Backtrack Explore">
			Backtrack
		</button>
		<button class="btn btn-small btn-primary" disabled={$gamePaused} on:click={handleExploreCommit} title="Commit Explore">
			Commit
		</button>
		<button class="btn btn-small" disabled={$gamePaused} on:click={handleExploreCancel} title="Cancel Explore">
			Cancel
		</button>
	{:else}
		<button class="btn btn-small" disabled={$gamePaused} on:click={handleExploreStart} title="Start Explore Mode">
			Explore
		</button>
	{/if}

=======
>>>>>>> c96b12047cad8a4bb8b633fed05f9def1bbb71b6
</div>


<style>
	.action-buttons {
		@apply flex flex-wrap justify-evenly self-end;
	}

	.btn-badge {
		@apply relative;
	}

	.badge {
		min-height: 20px;
		min-width:  20px;
		@apply p-1 rounded-full leading-none text-center text-xs text-white bg-gray-600 inline-block absolute top-0 left-0;
	}

	.badge-primary {
		@apply bg-primary;
	}
</style>