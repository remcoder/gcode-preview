import { BufferGeometry, 
    Color, 
    Float32BufferAttribute, 
    LineBasicMaterial, 
    LineSegments } from 'three';

class GridHelper extends LineSegments {

    constructor(sizeX: number, 
        stepX: number, 
        sizeZ: number, 
        stepZ: number,
        color1: Color | string | number = 0x444444, 
        color2: Color | string | number = 0x888888) {
        
        color1 = new Color(color1);
        color2 = new Color(color2);

        var x = Math.round( sizeX / stepX );
        var y = Math.round( sizeZ / stepZ );
            
        sizeX = x * stepX/2;
        sizeZ = y * stepZ/2;
    
        const vertices = [];
        const colors: Color | string | number[] = [];
        let j = 0;
        for ( var i = - 1 * sizeX; i <= sizeX; i += stepX ) {

            vertices.push(
                 i, 0, - 1 * sizeZ , //x Y z
                 i, 0, sizeZ  //x Y z
            );
    
            var color = i === 0 ? color1 : color2;
    
            color.toArray(colors, j); j+=3
            color.toArray(colors, j); j+=3
            color.toArray(colors, j); j+=3
            color.toArray(colors, j); j+=3
        }
    
        for ( var i = - 1 * sizeZ; i <= sizeZ; i += stepZ ) {
    
            vertices.push(
                 - 1 * sizeX, 0, i , //x Y z
                 sizeX, 0, i  //x Y z
            );
    
            var color = i === 0 ? color1 : color2;
    
            color.toArray(colors, j); j+=3
            color.toArray(colors, j); j+=3
            color.toArray(colors, j); j+=3
            color.toArray(colors, j); j+=3
        }

        const geometry = new BufferGeometry();
        geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
        const material = new LineBasicMaterial({ vertexColors: true, toneMapped: false });

        super(geometry, material);

        // this.type = 'BuildVolume';
    }
}

export { GridHelper };