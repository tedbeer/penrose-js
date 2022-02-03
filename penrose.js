const randHex = (min, max) => `#${Number(min + parseInt(Math.random() * (max - min))).toString(16)}`;
const line = (first, ...arg) => {
	const points = arg.map(p => `l${p.real.toFixed(6)},${p.imag.toFixed(6)}`).join(' ');
	return `m${first.real.toFixed(6)},${first.imag.toFixed(6)} ${points}z`;
}
const arc = (start, r, end) => `M ${start.real.toFixed(6)} ${start.imag.toFixed(6)}\
 A ${r} ${r} 0 0 0 ${end.real.toFixed(6)} ${end.imag.toFixed(6)}`;

// A small tolerance for comparing floats for equality
const TOL = 1.e-5;
// psi = 1/phi where phi is the Golden ratio, sqrt(5)+1)/2
export const psi = (Math.sqrt(5) - 1) / 2;
// psi**2 = 1 - psi
export const psi2 = 1 - psi;

export class Complex {
	constructor(real, imag) {
		this.real = real;
		this.imag = imag;
	}

	plus(b) {
		return new Complex(this.real + b.real, this.imag + b.imag);
	}

	minus(b) {
		return new Complex(this.real - b.real, this.imag - b.imag);
	}

	neg() {
		return new Complex(-this.real, -this.imag);
	}

	div(c) {
		if (Number.isFinite(c)) return new Complex(this.real / c, this.imag / c);

		return new Complex(
			(this.real * c.real + this.imag * c.imag)/(c.real * c.real + c.imag * c.imag),
			(this.imag * c.real - this.real * c.imag)/(c.real * c.real + c.imag * c.imag)
		);
	}

	mult(c) {
		if (Number.isFinite(c)) return new Complex(this.real * c, this.imag * c);

		return new Complex(
			this.real * c.real - this.imag * c.imag,
			this.real * c.imag + this.imag * c.real
		);
	}

	cross(b) {
		return this.real * b.imag - this.imag * b.real;
	}

	middle(b) {
		return this.plus(b).div(2);
	}

	abs() {
		return Math.sqrt(this.real * this.real + this.imag * this.imag);
	}

	conjugate() {
		return new Complex(this.real, -this.imag);
	}

	toString() {
		return `(${this.real.toFixed(6)}, ${this.imag.toFixed(6)})`;
	}
};

export class RobinsonTriangle {
    /*
    A class representing a Robinson triangle and the rhombus formed from it.
    */
    constructor(A, B, C) {
        /*
        Initialize the triangle with the ordered vertices. A and C are the
        vertices at the equal base angles; B is at the vertex angle.
        */
        this.A = Number.isFinite(A) ? new Complex(A, 0) : A;
        this.B = Number.isFinite(B) ? new Complex(B, 0) : B;
        this.C = Number.isFinite(C) ? new Complex(C, 0) : C;
    }

    centre() {
        /*
        Return the position of the centre of the rhombus formed from two
        triangles joined by their bases.
        */
        return this.A.middle(this.C);
    }

    path(rhombus = true) {
        /*
        Return the SVG "d" path element specifier for the rhombus formed
        by this triangle and its mirror image joined along their bases. If
        rhombus = false, the path for the triangle itself is returned instead.
        */
        const AB = this.B.minus(this.A);
        const BC = this.C.minus(this.B);
        if (rhombus) return line(this.A, AB, BC, AB.neg());
        return line(this.A, AB, BC);
    }

    get_arc_d(U, V, W, half_arc = false) {
        /*
        Return the SVG "d" path element specifier for the circular arc between
        sides UV and UW, joined at half-distance along these sides. If
        half_arc is True, the arc is at the vertex of a rhombus; if half_arc
        is False, the arc is drawn for the corresponding vertices of a
        Robinson triangle.
        */
        let start = U.middle(V);
        let end = U.middle(W);
        // arc radius
        const r = V.minus(U).div(2).abs();

        if (half_arc) {
            // Find the endpoint of the "half-arc" terminating on the triangle
            // base
            const UN = V.plus(W).minus(U.mult(2));
            end = U.add(UN.mult(r / UN.abs()));
        }

        // ensure we draw the arc for the angular component < 180 deg
        const US = start.minus(U);
        const UE = end.minus(U);
        if (US.cross(UE) > 0) [start, end] = [end, start];

        return arc(start, r, end);
    }

    arcs(half_arc = false) {
        /*
        Return the SVG "d" path element specifiers for the two circular arcs
        about vertices A and C. If half_arc is True, the arc is at the vertex
        of a rhombus; if half_arc is False, the arc is drawn for the
        corresponding vertices of a Robinson triangle.

        */

        const D = this.A.minus(this.B).plus(this.C);
        const arc1_d = this.get_arc_d(this.A, this.B, D, half_arc);
        const arc2_d = this.get_arc_d(this.C, this.B, D, half_arc);
        return [arc1_d, arc2_d];
    }

    conjugate() {
        /*
        Return the vertices of the reflection of this triangle about the
        x-axis. Since the vertices are stored as complex numbers, we simply
        need the complex conjugate values of their values.
        */
        return new this.constructor(this.A.conjugate(), this.B.conjugate(), this.C.conjugate());
    }

	toString() {
		return `{ A:${this.A} , B:${this.B}, C: ${this.C} }`;
	}
};

export class BtileL extends RobinsonTriangle {
    /*
    A class representing a "B_L" Penrose tile in the P3 tiling scheme as
    a "large" Robinson triangle (sides in ratio 1:1:phi).
    */
    constructor(A, B, C) {
    	super(A, B, C);
    }

    inflate() {
        /*
        "Inflate" this tile, returning the three resulting Robinson triangles
        in a list.
        */
        // D and E divide sides AC and AB respectively
        const D = this.A.mult(psi2).plus(this.C.mult(psi));
        const E = this.A.mult(psi2).plus(this.B.mult(psi));
        // Take care to order the vertices here so as to get the right
        // orientation for the resulting triangles.
        return [new BtileL(D, E, this.A),
                new BtileS(E, D, this.B),
                new BtileL(this.C, D, this.B)];
    }

    toString() {
    	return `BtileL: ${super.toString()}`;
    }
};

export class BtileS extends RobinsonTriangle {
    /*
    A class representing a "B_S" Penrose tile in the P3 tiling scheme as
    a "small" Robinson triangle (sides in ratio 1:1:psi).
    */
    constructor(A, B, C) {
    	super(A, B, C);
    }

    inflate() {
        /*
        "Inflate" this tile, returning the two resulting Robinson triangles
        in a list.
        */
        const D = this.A.mult(psi).plus(this.B.mult(psi2));
        return [new BtileS(D, this.C, this.A), new BtileL(this.C, D, this.B)];
    }

    toString() {
    	return `BtileS: ${super.toString()}`;
    }
};

export class PenroseP3 {
    /* A class representing the P3 Penrose tiling. */

    constructor(scale = 200, ngen = 4, config = {}) {
        /*
        Initialise the PenroseP3 instance with a scale determining the size
        of the final image and the number of generations, ngen, to inflate
        the initial triangles. Further configuration is provided through the
        key, value pairs of the optional config dictionary.
        */

        this.scale = scale;
        this.ngen = ngen;

        // Default configuration
        this.config = {
			'width': '100%', 'height': '100%',
			'stroke-colour': '#fff',
			'base-stroke-width': 0.05,
			'margin': 1.05,
			'tile-opacity': 0.6,
			'random-tile-colours': false,
			'Stile-colour': '#08f',
			'Ltile-colour': '#0035f3',
			'Aarc-colour': '#f00',
			'Carc-colour': '#00f',
			'draw-tiles': true,
			'draw-arcs': false,
			'reflect-x': true,
			'draw-rhombuses': true,
			'rotate': 0,
			'flip-y': false, 'flip-x': false,
			...config
		};
        // And ensure width, height values are strings for the SVG
        this.config['width'] = String(this.config['width']);
        this.config['height'] = String(this.config['height']);
        this.elements = [];
    }

    set_initial_tiles(tiles) {
        this.elements = tiles;
    }

    inflate() {
        /* "Inflate" each triangle in the tiling ensemble.*/
        const new_elements = [];
        this.elements.forEach(element => new_elements.push(...element.inflate()));
        this.elements = new_elements;
    }

    remove_dupes() {
        /*
        Remove triangles giving rise to identical rhombuses from the
        ensemble.
        */

        // Triangles give rise to identical rhombuses if these rhombuses have
        // the same centre.
        this.elements = this.elements.map((element, index) => ({
        	index, center: element.centre(), element
        })).sort((a, b) => {
        	if (Math.abs(a.center.real - b.center.real) < TOL && Math.abs(a.center.imag - b.center.imag) < TOL) return 0;
        	if ( Math.abs(a.center.real - b.center.real) < TOL) return a.center.imag - b.center.imag;
        	return a.center.real - b.center.real;
        }).map((item, index, arr) =>
        	((index > 0 && item.center.minus(arr[index - 1].center).abs() < TOL) ? null : item.element)
        ).filter(Boolean);
    }

    add_conjugate_elements() {
        /* Extend the tiling by reflection about the x-axis. */
        this.elements.push(...this.elements.map(e => e.conjugate()));
    }

    rotate(theta) {
        /* Rotate the figure anti-clockwise by theta radians.*/
        const rot = new Complex(Math.cos(theta), Math.sin(theta));
        this.elements.forEach(e => {
            e.A = rot.mult(e.A);
            e.B = rot.mult(e.B);
            e.C = rot.mult(e.C);
        });
    }

    flip_y() {
        /* Flip the figure about the y-axis. */
        this.elements.forEach(e => {
            e.A = new Complex(-e.A.real, e.A.imag);
            e.B = new Complex(-e.B.real, e.B.imag);
            e.C = new Complex(-e.C.real, e.C.imag);
        });
    }

    flip_x() {
        /* Flip the figure about the x-axis. */
        this.elements.forEach(e => {
            e.A = e.A.conjugate();
            e.B = e.B.conjugate();
            e.C = e.C.conjugate();
        });
    }

    make_tiling() {
        /* Make the Penrose tiling by inflating ngen times. */
        for (let i = this.ngen; i > 0; i--) {
        	this.inflate();
        }
        if (this.config['draw-rhombuses']) this.remove_dupes();
        if (this.config['reflect-x']) {
            this.add_conjugate_elements();
            this.remove_dupes();
        }
        // Rotate the figure anti-clockwise by theta radians.
        const theta = this.config['rotate'];
        if (theta) this.rotate(theta);

        // Flip the image about the y-axis (note this occurs _after_ any
        // rotation.
        if (this.config['flip-y']) this.flip_y();

        // Flip the image about the x-axis (note this occurs _after_ any
        // rotation and after any flip about the y-axis.
        if (this.config['flip-x']) this.flip_x();
    }

    get_tile_colour(e) {
        /* Return a HTML-style colour string for the tile. */

        // Return a random colour as '#xxx'
        if (this.config['random-tile-colours']) return randHex(0, 0xfff);

        // Return the colour string, or call the colour function as appropriate
        if (e instanceof BtileL) {
            if (this.config['Ltile-colour'] instanceof Function) {
                return this.config['Ltile-colour'](e);
            } else {
                return this.config['Ltile-colour'];
            }
        }

        if (this.config['Stile-colour'] instanceof Function) {
        	return this.config['Stile-colour'](e);
        } else {
        	return this.config['Stile-colour'];
        }
    }

    make_svg() {
        /* Make and return the SVG for the tiling as a str. */

        const xmin = -this.scale * this.config['margin'];
        const ymin = xmin;
        const width = 2*this.scale * this.config['margin'];
        const height = width;
        const viewbox =`${xmin} ${ymin} ${width} ${height}`;
        const svg = [// '<?xml version="1.0" encoding="utf-8"?>',
               `<svg width="${this.config['width']}" height="${this.config['height']}" viewBox="${viewbox}"`,
                ' preserveAspectRatio="xMidYMid meet" version="1.1"',
                ' baseProfile="full" xmlns="http://www.w3.org/2000/svg">'];

        // The tiles' stroke widths scale with ngen
        const stroke_width = Number(psi**this.ngen * this.scale * this.config['base-stroke-width']).toFixed(6);
        svg.push(`<g style="stroke:${this.config['stroke-colour']};\
stroke-width: ${stroke_width}; stroke-linejoin: round;">`);
        const draw_rhombuses = this.config['draw-rhombuses'];
        this.elements.forEach(e => {
            if (this.config['draw-tiles'])
                svg.push(`<path fill="${this.get_tile_colour(e)}"\
 fill-opacity="${this.config['tile-opacity']}"\
 d="${e.path(draw_rhombuses)}"/>`);
            if (this.config['draw-arcs']) {
                const [arc1_d, arc2_d] = e.arcs(!draw_rhombuses);
                svg.push(
                	`<path fill="none" stroke="${this.config['Aarc-colour']}" d="${arc1_d}" />`,
                	`<path fill="none" stroke="${this.config['Carc-colour']}" d="${arc2_d}" />`
                );
            }
        });
        svg.push('</g>\n</svg>')
        return svg.join('\n');
    }

    // write_svg(filename) {
    //     /* Make and write the SVG for the tiling to filename. */
    //     svg = this.make_svg()
    //     with open(filename, 'w') as fo:
    //         fo.write(svg)
    // }
};
