document.addEventListener('DOMContentLoaded', () => {
    const themeBtn = document.getElementById('themeToggle');
    const rootElement = document.body;
    const themeIcon = themeBtn.querySelector('i');

    // Retrieve saved theme or set light by default
    const currentTheme = localStorage.getItem('velvet-theme') || 'light';
    rootElement.setAttribute('data-theme', currentTheme);

    if (currentTheme === 'dark') {
        themeIcon.className = 'fas fa-moon';
    } else {
        themeIcon.className = 'fas fa-sun';
    }

    // Toggle logic
    themeBtn.addEventListener('click', () => {
        const theme = rootElement.getAttribute('data-theme');
        if (theme === 'light') {
            rootElement.setAttribute('data-theme', 'dark');
            themeIcon.className = 'fas fa-moon';
            localStorage.setItem('velvet-theme', 'dark');
        } else {
            rootElement.setAttribute('data-theme', 'light');
            themeIcon.className = 'fas fa-sun';
            localStorage.setItem('velvet-theme', 'light');
        }
    });

    // Sidebar Toggle
    const menuToggle = document.querySelector('.menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');

    let sidebarOpen = true;

    menuToggle.addEventListener('click', () => {
        if (sidebarOpen) {
            sidebar.style.transform = 'translateX(-100%)';
            mainContent.style.marginLeft = '0';
        } else {
            sidebar.style.transform = 'translateX(0)';
            mainContent.style.marginLeft = '240px';
        }
        sidebarOpen = !sidebarOpen;
    });

    // Simulate progress bar load
    setTimeout(() => {
        const progressBars = document.querySelectorAll('.progress-fill');
        progressBars.forEach(bar => {
            const width = bar.style.width;
            bar.style.width = '0%';
            setTimeout(() => {
                bar.style.width = width;
            }, 100);
        });
    }, 500);

    // Initialize Trend Chart (ApexCharts)
    if (document.getElementById('trendChart') && typeof ApexCharts !== 'undefined') {
        const options = {
            series: [{
                name: 'Users',
                data: [45, 52, 38, 24, 33, 26, 21, 20, 6, 8, 15, 10]
            }, {
                name: 'Sessions',
                data: [35, 41, 62, 42, 13, 18, 29, 37, 36, 51, 32, 35]
            }],
            chart: {
                height: 300,
                type: 'area',
                toolbar: { show: false },
                fontFamily: 'Inter, sans-serif'
            },
            colors: ['rgb(142, 84, 233)', 'rgb(245, 111, 75)'],
            dataLabels: {
                enabled: false
            },
            stroke: {
                curve: 'smooth',
                width: 2
            },
            xaxis: {
                categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                axisBorder: { show: false },
                axisTicks: { show: false },
                labels: {
                    style: { colors: 'rgba(255, 255, 255, 0.5)' } // Dark mode standard fallbacks
                }
            },
            yaxis: {
                labels: {
                    style: { colors: 'rgba(255, 255, 255, 0.5)' }
                }
            },
            grid: {
                borderColor: 'rgba(255, 255, 255, 0.1)',
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
                labels: { colors: 'var(--text-main)' }
            },
            tooltip: {
                theme: 'dark' // Fixed tooltip theme for Velvet
            }
        };

        const chart = new ApexCharts(document.querySelector("#trendChart"), options);
        chart.render();
    }
});
