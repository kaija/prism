document.addEventListener('DOMContentLoaded', () => {

    /* =========================================================
     * Theme Toggle Logic
     * ========================================================= */
    const themeToggleBtn = document.getElementById('themeToggle');
    const rootElement = document.body;
    const themeIcon = themeToggleBtn.querySelector('i');

    // Retrieve saved theme or set dark by default (Vuexy focus)
    const currentTheme = localStorage.getItem('vuexy-theme') || 'dark';
    rootElement.setAttribute('data-theme', currentTheme);

    const updateThemeIcon = (theme) => {
        if (theme === 'dark') {
            themeIcon.className = 'ti ti-sun'; // Show sun when in dark mode
        } else {
            themeIcon.className = 'ti ti-moon-stars'; // Show moon when in light mode
        }
    };
    updateThemeIcon(currentTheme);

    // Toggle logic
    themeToggleBtn.addEventListener('click', () => {
        const theme = rootElement.getAttribute('data-theme');
        if (theme === 'light') {
            rootElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('vuexy-theme', 'dark');
            updateThemeIcon('dark');
        } else {
            rootElement.setAttribute('data-theme', 'light');
            localStorage.setItem('vuexy-theme', 'light');
            updateThemeIcon('light');
        }

        // Dispatch event for ApexCharts to update colors if necessary
        window.dispatchEvent(new Event('theme-changed'));
    });

    /* =========================================================
     * Sidebar Menu & Sub-menu Interaction
     * ========================================================= */
    const menuItemsWithSub = document.querySelectorAll('.has-submenu > .menu-link');

    menuItemsWithSub.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const parentLi = item.closest('.menu-item');

            // Close other open submenus if desired (accordion style)
            const openSiblings = parentLi.parentElement.querySelectorAll('.menu-item.opened');
            openSiblings.forEach(sibling => {
                if (sibling !== parentLi) {
                    sibling.classList.remove('opened');
                    // optional: slide up animation logic here if not purely CSS
                }
            });

            // Toggle current submenu
            parentLi.classList.toggle('opened');
        });
    });

    // Mobile Sidebar Toggle (Simulated)
    const sidebarToggleBtn = document.querySelector('.menu-toggle');
    const sidebarCloseBtn = document.querySelector('.sidebar-close-btn');
    const sidebar = document.querySelector('.sidebar');

    const toggleSidebar = () => {
        sidebar.classList.toggle('open');
    };

    if (sidebarToggleBtn) sidebarToggleBtn.addEventListener('click', toggleSidebar);
    if (sidebarCloseBtn) sidebarCloseBtn.addEventListener('click', toggleSidebar);

    /* =========================================================
     * ApexCharts Initialization
     * ========================================================= */
    if (document.getElementById('revenueChart') && typeof ApexCharts !== 'undefined') {

        const getChartColors = () => {
            const isDark = rootElement.getAttribute('data-theme') === 'dark';
            return {
                text: isDark ? 'rgba(207, 211, 236, 0.6)' : 'rgba(68, 64, 80, 0.6)',
                grid: isDark ? '#44485E' : '#EBE9F1',
                tooltipTheme: isDark ? 'dark' : 'light'
            };
        };

        let colors = getChartColors();

        const options = {
            series: [{
                name: 'Earning',
                data: [95, 177, 284, 256, 105, 63, 168]
            }, {
                name: 'Expense',
                data: [-145, -80, -60, -181, -100, -68, -115]
            }],
            chart: {
                type: 'bar',
                height: 280,
                stacked: true,
                toolbar: { show: false },
                fontFamily: 'Public Sans, sans-serif'
            },
            colors: ['#7367F0', '#00BAD1'], /* Primary and Info */
            plotOptions: {
                bar: {
                    horizontal: false,
                    columnWidth: '20%',
                    borderRadius: 4,
                    startingShape: 'rounded',
                    endingShape: 'rounded'
                },
            },
            dataLabels: {
                enabled: false
            },
            stroke: {
                curve: 'smooth',
                width: 4,
                lineCap: 'round',
                colors: ['transparent']
            },
            legend: {
                show: false
            },
            grid: {
                borderColor: colors.grid,
                strokeDashArray: 5,
                padding: { top: -20, bottom: -10 }
            },
            xaxis: {
                categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
                axisBorder: { show: false },
                axisTicks: { show: false },
                labels: {
                    style: { colors: colors.text, fontSize: '13px' }
                }
            },
            yaxis: {
                labels: {
                    style: { colors: colors.text, fontSize: '13px' }
                }
            },
            tooltip: {
                theme: colors.tooltipTheme,
                y: { formatter: function (val) { return "$" + val + "k" } }
            }
        };

        const chart = new ApexCharts(document.querySelector("#revenueChart"), options);
        chart.render();

        // Re-render chart colors on theme toggle
        window.addEventListener('theme-changed', () => {
            colors = getChartColors();
            chart.updateOptions({
                grid: { borderColor: colors.grid },
                xaxis: { labels: { style: { colors: colors.text } } },
                yaxis: { labels: { style: { colors: colors.text } } },
                tooltip: { theme: colors.tooltipTheme }
            });
        });
    }
});
