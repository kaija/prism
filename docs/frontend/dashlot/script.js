document.addEventListener('DOMContentLoaded', () => {
    // Theme Toggle Functionality
    const themeToggleBtn = document.getElementById('themeToggle');
    const rootElement = document.documentElement;
    const themeIcon = themeToggleBtn.querySelector('i');

    // Check for saved theme
    const savedTheme = localStorage.getItem('dashlot-theme');
    if (savedTheme === 'dark') {
        rootElement.setAttribute('data-theme', 'dark');
        themeIcon.className = 'fas fa-sun';
    }

    // Toggle Theme
    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = rootElement.getAttribute('data-theme');

        if (currentTheme === 'dark') {
            rootElement.removeAttribute('data-theme');
            themeIcon.className = 'fas fa-moon';
            localStorage.setItem('dashlot-theme', 'light');
        } else {
            rootElement.setAttribute('data-theme', 'dark');
            themeIcon.className = 'fas fa-sun';
            localStorage.setItem('dashlot-theme', 'dark');
        }
    });

    // Sidebar Toggle Functionality
    const menuToggleBtn = document.querySelector('.menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');

    // Simple toggle logic for the sidebar layout
    let isSidebarOpen = true;

    menuToggleBtn.addEventListener('click', () => {
        if (isSidebarOpen) {
            sidebar.style.transform = 'translateX(-100%)';
            mainContent.style.marginLeft = '0';
            mainContent.style.width = '100%';
        } else {
            sidebar.style.transform = 'translateX(0)';
            mainContent.style.marginLeft = '250px';
            mainContent.style.width = 'calc(100% - 250px)';
        }
        isSidebarOpen = !isSidebarOpen;
    });

    // Make range slider visual fill update
    const slider = document.querySelector('.range-slider');
    if (slider) {
        slider.addEventListener('input', (e) => {
            const value = (e.target.value - e.target.min) / (e.target.max - e.target.min) * 100;
            // Add a background gradient to simulate fill on vanilla slider
            e.target.style.background = `linear-gradient(to right, #51adf6 0%, #51adf6 ${value}%, var(--bg-progress-track) ${value}%, var(--bg-progress-track) 100%)`;
        });

        // Initial setup
        slider.dispatchEvent(new Event('input'));
    }

    // Initialize Trend Chart (ApexCharts)
    if (document.getElementById('trendChart') && typeof ApexCharts !== 'undefined') {
        const options = {
            series: [{
                name: 'Revenue',
                data: [31, 40, 28, 51, 42, 109, 100]
            }, {
                name: 'Expenses',
                data: [11, 32, 45, 32, 34, 52, 41]
            }],
            chart: {
                height: 300,
                type: 'area',
                toolbar: { show: false },
                fontFamily: 'Roboto, sans-serif'
            },
            colors: ['rgb(74, 119, 240)', 'rgb(253, 197, 48)'],
            dataLabels: {
                enabled: false
            },
            stroke: {
                curve: 'smooth',
                width: 2
            },
            xaxis: {
                categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
                axisBorder: { show: false },
                axisTicks: { show: false },
                labels: {
                    style: { colors: 'var(--text-muted)' }
                }
            },
            yaxis: {
                labels: {
                    style: { colors: 'var(--text-muted)' }
                }
            },
            grid: {
                borderColor: 'var(--border-color)',
                strokeDashArray: 4,
            },
            fill: {
                type: 'gradient',
                gradient: {
                    shadeIntensity: 1,
                    opacityFrom: 0.4,
                    opacityTo: 0.05,
                    stops: [0, 90, 100]
                }
            },
            legend: {
                position: 'top',
                horizontalAlign: 'right',
                labels: { colors: 'var(--text-default)' }
            },
            tooltip: {
                theme: 'dark' // Use dark theme by default based on extraction
            }
        };

        const chart = new ApexCharts(document.querySelector("#trendChart"), options);
        chart.render();
    }
});
