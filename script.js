document.addEventListener('DOMContentLoaded', () => {
    const videoLinkInput = document.getElementById('videoLink');
    const downloadBtn = document.getElementById('downloadBtn');
    const loadingAnimation = document.querySelector('.loading-animation');
    const thumbnailResults = document.querySelector('.thumbnail-results');
    const thumbnailPreviewContainer = document.querySelector('.thumbnail-preview-container');
    const downloadOptionsContainer = document.querySelector('.download-options-container');
    const errorMessage = document.querySelector('.error-message');
    const burger = document.querySelector('.burger');
    const navLinks = document.querySelector('.nav-links');
    const scrollButton = document.getElementById('scrollToTopBtn');
    const faqItems = document.querySelectorAll('.faq-item');

    // --- Navigation Toggle (Smooth & Animated) ---
    burger.addEventListener('click', () => {
        navLinks.classList.toggle('nav-active');
        burger.classList.toggle('toggle'); // For burger animation

        navLinks.querySelectorAll('li').forEach((link, index) => {
            if (navLinks.classList.contains('nav-active')) {
                link.style.animation = `navLinkFade 0.5s ease forwards ${index / 7 + 0.3}s`;
            } else {
                link.style.animation = ''; // Reset animation on close
            }
        });
    });

    // Close nav on link click (for mobile)
    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            if (navLinks.classList.contains('nav-active')) {
                navLinks.classList.remove('nav-active');
                burger.classList.remove('toggle');
                navLinks.querySelectorAll('li').forEach(item => item.style.animation = '');
            }
        });
    });

    // --- Thumbnail Downloader Logic ---
    // Function to reset UI state
    function resetUI() {
        thumbnailPreviewContainer.innerHTML = '';
        downloadOptionsContainer.innerHTML = '';
        loadingAnimation.style.display = 'none';
        thumbnailResults.style.display = 'none';
        errorMessage.style.display = 'none';
        errorMessage.querySelector('p').textContent = '';
    }

    // Event listener for main download button click
    downloadBtn.addEventListener('click', handleDownload);

    // Allow pressing Enter in the input field
    videoLinkInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleDownload();
        }
    });

    async function handleDownload() {
        resetUI(); // Reset UI before new search

        const videoLink = videoLinkInput.value.trim();

        if (!videoLink) {
            showError('Please paste a YouTube video link to get started!');
            return;
        }

        const videoId = extractVideoId(videoLink);
        if (!videoId) {
            showError('Invalid YouTube video link. Please ensure it\'s a valid URL.');
            return;
        }

        loadingAnimation.style.display = 'flex'; // Show loading animation

        try {
            // Define the specific qualities we want to check and offer download for
            const desiredQualities = {
                'Max Quality': `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
                'High Quality': `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
                'Medium Quality': `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
                'Standard Quality': `https://i.ytimg.com/vi/${videoId}/sddefault.jpg`,
                'Default': `https://i.ytimg.com/vi/${videoId}/default.jpg`
            };

            let availableThumbnails = [];
            // Map desired qualities to promises that check their existence
            const checkPromises = Object.keys(desiredQualities).map(qualityName => {
                return new Promise(resolve => {
                    const url = desiredQualities[qualityName];
                    const img = new Image();
                    img.onload = () => {
                        // Basic check: if it's maxresdefault but loaded a tiny image, it's not the true maxres.
                        // YouTube serves a 120x90 default image if maxresdefault doesn't exist.
                        if (qualityName === 'Max Quality' && (img.width < 1280 || img.height < 720) && (img.width > 0 && img.height > 0)) {
                            // This means maxresdefault is not truly available in high resolution.
                            resolve(null);
                        } else if (img.width > 0 && img.height > 0) {
                            availableThumbnails.push({
                                quality: qualityName,
                                url: url,
                                width: img.width,
                                height: img.height
                            });
                            resolve(true);
                        } else {
                            resolve(null); // Image loaded but dimensions are 0 (invalid)
                        }
                    };
                    img.onerror = () => {
                        resolve(null); // Image failed to load at all
                    };
                    img.src = url;
                });
            });

            // Simulate API delay for a better user experience
            await new Promise(resolve => setTimeout(resolve, 1500));
            loadingAnimation.style.display = 'none'; // Hide loading animation

            await Promise.all(checkPromises); // Wait for all image checks to complete

            // Sort by resolution (highest first)
            const qualityOrder = {
                'Max Quality': 5, 'High Quality': 4,
                'Standard Quality': 3, 'Medium Quality': 2,
                'Default': 1
            };
            availableThumbnails.sort((a, b) => qualityOrder[b.quality] - qualityOrder[a.quality]);

            if (availableThumbnails.length === 0) {
                showError('No valid thumbnails found for this video. It might be private, deleted, or an incorrect link.');
                return;
            }

            thumbnailResults.style.display = 'flex'; // Show the results container

            // Display only the highest quality thumbnail as preview
            const highestQualityThumbnail = availableThumbnails[0];
            const previewItem = document.createElement('div');
            previewItem.classList.add('thumbnail-preview-item');

            const imgElement = document.createElement('img');
            imgElement.src = highestQualityThumbnail.url;
            imgElement.alt = `Preview Thumbnail (${highestQualityThumbnail.quality})`;
            imgElement.title = `Preview Thumbnail (${highestQualityThumbnail.width}x${highestQualityThumbnail.height})`;

            const qualityText = document.createElement('p');
            qualityText.textContent = `Preview: ${highestQualityThumbnail.quality} (${highestQualityThumbnail.width}x${highestQualityThumbnail.height})`;

            previewItem.appendChild(imgElement);
            previewItem.appendChild(qualityText);
            thumbnailPreviewContainer.appendChild(previewItem);
            previewItem.style.animation = `fadeIn 0.6s ease-out forwards`; // Animate its appearance


            // Create up to 4 download buttons for the *best available qualities*
            const downloadQualitiesToOffer = availableThumbnails.slice(0, 4); // Get top 4 available

            if (downloadQualitiesToOffer.length > 0) {
                 downloadQualitiesToOffer.forEach((thumb, index) => {
                    const downloadButton = document.createElement('button');
                    downloadButton.classList.add('download-button');
                    downloadButton.innerHTML = `<i class="fas fa-download"></i> Download ${thumb.quality}`;
                    downloadButton.onclick = () => downloadThumbnail(thumb.url, `${videoId}_${thumb.quality.replace(/[^a-zA-Z0-9]/g, '')}.jpg`);
                    downloadOptionsContainer.appendChild(downloadButton);
                    downloadButton.style.animation = `fadeIn 0.6s ease-out forwards ${index * 0.15}s`; // Stagger animation
                });
            } else {
                // This case should be rare if availableThumbnails is not empty, but as a fallback:
                showError('No download qualities could be generated. Try a different video.');
            }


        } catch (error) {
            loadingAnimation.style.display = 'none';
            showError('An error occurred while fetching thumbnails. Please try again later.');
            console.error('Error fetching thumbnails:', error);
        }
    }

    // Function to extract YouTube video ID
    function extractVideoId(url) {
        const regex = /(?:https?:\/\/)?(?:www\.)?(?:m\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=|embed\/|v\/|)([\w-]{11})(?:\S+)?/;
        const match = url.match(regex);
        return match ? match[1] : null;
    }

    // Function to initiate direct download
    async function downloadThumbnail(url, filename) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const blob = await response.blob();
            const downloadUrl = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(downloadUrl); // Clean up the URL object
        } catch (error) {
            console.error('Error downloading thumbnail:', error);
            showError('Failed to download thumbnail. Please try again.');
        }
    }

    function showError(message) {
        errorMessage.querySelector('p').textContent = message;
        errorMessage.style.display = 'block';
    }


    // --- Scroll to Top Button Logic ---
    window.addEventListener('scroll', () => {
        if (window.scrollY > 400) { // Show button after scrolling 400px
            scrollButton.classList.add('show');
        } else {
            scrollButton.classList.remove('show');
        }
    });

    scrollButton.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });

    // --- FAQ Accordion Logic ---
    faqItems.forEach(item => {
        const header = item.querySelector('h3');
        header.addEventListener('click', () => {
            // Close all other active items
            faqItems.forEach(otherItem => {
                if (otherItem !== item && otherItem.classList.contains('active')) {
                    otherItem.classList.remove('active');
                    otherItem.querySelector('p').style.height = 0;
                }
            });

            // Toggle current item
            item.classList.toggle('active');
            const paragraph = item.querySelector('p');
            if (item.classList.contains('active')) {
                // Set height to scrollHeight for smooth animation
                paragraph.style.height = paragraph.scrollHeight + 'px';
            } else {
                paragraph.style.height = 0;
            }
        });
    });

    // Intersection Observer for section animations
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1 // Trigger when 10% of the element is visible
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                if (entry.target.classList.contains('animated-step')) {
                    entry.target.style.animationPlayState = 'running';
                } else if (entry.target.classList.contains('animated-feature')) {
                    entry.target.style.animationPlayState = 'running';
                } else if (entry.target.classList.contains('animated-faq')) {
                    entry.target.style.animationPlayState = 'running';
                } else if (entry.target.classList.contains('animated-contact-box')) {
                    entry.target.style.animationPlayState = 'running';
                }
                // If you want elements to animate only once, uncomment the line below:
                // observer.unobserve(entry.target);
            } else {
                 // Reset animation state when not intersecting (optional, for re-animation on scroll up)
                if (entry.target.classList.contains('animated-step') ||
                    entry.target.classList.contains('animated-feature') ||
                    entry.target.classList.contains('animated-faq') ||
                    entry.target.classList.contains('animated-contact-box')) {
                    entry.target.style.animationPlayState = 'paused';
                    entry.target.style.opacity = 0; // Reset opacity for re-animation
                    entry.target.style.transform = 'translateY(20px)'; // Reset transform for re-animation
                }
            }
        });
    }, observerOptions);

    // Apply observer to elements
    document.querySelectorAll('.animated-step').forEach(el => observer.observe(el));
    document.querySelectorAll('.animated-feature').forEach(el => observer.observe(el));
    document.querySelectorAll('.animated-faq').forEach(el => observer.observe(el));
    document.querySelectorAll('.animated-contact-box').forEach(el => observer.observe(el));

});
