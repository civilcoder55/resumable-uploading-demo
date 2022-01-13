import uploadAndTrackFiles from './ui.js'

const fileInput = document.getElementById('file-input');

fileInput.addEventListener('change', e => {
	uploadAndTrackFiles(e.currentTarget.files)
	e.currentTarget.value = '';
})